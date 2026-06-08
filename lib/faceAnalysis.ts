/**
 * Face analysis pre-step for avatar generation.
 *
 * Runs a vision LLM (LLaVA v1.6) over the input photo to extract
 * structured facial attributes - face shape, gender presentation,
 * hair, eye color, expression, age range, notable features. These
 * attributes get baked into the rd-fast prompt as preservation
 * context so the chunky pixel art output actually looks like the
 * specific person instead of a generic stylized character.
 *
 * Cost: ~$0.002 per call. Runs in parallel with bg-removal so it
 * doesn't add latency to the user's wait.
 */
import Replicate from "replicate";

const ANALYSIS_MODEL = "yorickvp/llava-v1.6-mistral-7b";

const ANALYSIS_PROMPT = `Look at this person and answer ONLY these 5 questions, one line each, very short answers (no explanation):

Gender: <man, woman, or androgynous>
Hair: <"bald" if fully bald, "shaved" if scalp visible through stubble, "buzz cut" if short crew cut, OR length and color and style e.g. "long red wavy", "short brown straight", "medium blonde curly">
Facial hair: <"none" / "clean shaven", OR color + length e.g. "full red beard", "short brown stubble", "thin black goatee">
Glasses: <"none", OR style and size e.g. "small wire-rim eyeglasses", "oversized thick black frames", "small round vintage">
Skin tone: <light, medium-light, medium, medium-dark, dark, or very dark>`;

export interface FaceAttributes {
  /** "man", "woman", or "androgynous" */
  gender: string;
  /** Either "bald" / "shaved" / "buzz cut" OR full description like "long red wavy" */
  hair: string;
  /** "none" / "clean shaven" OR description like "full red beard" */
  facialHair: string;
  /** "none" OR description like "small wire-rim eyeglasses" */
  glasses: string;
  /** "light", "medium", "dark", etc. */
  skinTone: string;
}

let client: Replicate | null = null;
if (process.env.REPLICATE_API_TOKEN) {
  client = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });
}

export async function analyzeFace(
  imageDataUrl: string
): Promise<FaceAttributes | null> {
  if (!client) return null;

  try {
    const output = await client.run(
      ANALYSIS_MODEL as `${string}/${string}`,
      {
        input: {
          image: imageDataUrl,
          prompt: ANALYSIS_PROMPT,
          max_tokens: 220,
          temperature: 0.1, // tight, deterministic answers
        },
      }
    );

    const text = stringifyLlavaOutput(output);
    return parseFaceAttributes(text);
  } catch (err) {
    console.warn(
      "[faceAnalysis] failed:",
      err instanceof Error ? err.message : err
    );
    return null;
  }
}

/**
 * Build a comma-separated prompt fragment from extracted attributes
 * that we can splice into the main rd-fast prompt. Example output:
 *
 *   "feminine presenting, oval face shape, long red wavy hair,
 *    blue eyes, closed-mouth smile, 30s"
 *
 * Empty attributes are skipped so an analysis that only gets some
 * fields still contributes useful guidance.
 */
export function attributesToPromptFragment(attrs: FaceAttributes): string {
  const parts: string[] = [];
  const notPresent = (s: string | undefined) =>
    !s || /^(none|no|n\/a|clean[\s-]?shaven)$/i.test(s.trim());

  if (attrs.gender) parts.push(`a ${attrs.gender}`);

  // Detect bald-ish state (bald, shaved, buzz cut all read as "no
  // visible hair" at 64-pixel chunky scale).
  const hair = (attrs.hair || "").toLowerCase();
  const isBaldish =
    /\b(bald|shaved|buzz(ed)?|crew[\s-]?cut|skinhead|no hair)\b/.test(hair);

  if (isBaldish) {
    parts.push(
      "COMPLETELY BALD: scalp area shows pure skin tone, NO hair pixels of any color (including no gray, no brown, no stubble pattern) on top of the head"
    );
  } else if (attrs.hair) {
    parts.push(`with ${attrs.hair} hair`);
  }

  if (!notPresent(attrs.facialHair)) {
    parts.push(`with ${attrs.facialHair} (preserve color exactly)`);
  } else {
    parts.push("clean shaven");
  }

  if (!notPresent(attrs.glasses)) {
    parts.push(`wearing ${attrs.glasses} (preserve size and style)`);
  }

  if (attrs.skinTone) parts.push(`${attrs.skinTone} skin`);

  return parts.join(", ");
}

// ---- internals ----

/**
 * LLaVA on Replicate can return its output as:
 *   - a single string
 *   - an array of token strings that need joining
 *   - a ReadableStream of tokens
 * Convert any of those to a plain string.
 */
function stringifyLlavaOutput(output: unknown): string {
  if (typeof output === "string") return output;
  if (Array.isArray(output)) return output.map(String).join("");
  if (output && typeof output === "object") {
    // Best-effort for stream-like or wrapper objects
    try {
      return String(output);
    } catch {
      return "";
    }
  }
  return "";
}

function parseFaceAttributes(text: string): FaceAttributes {
  const extract = (label: string): string => {
    // Match "label: value" with case-insensitive label, value runs to
    // newline. Allow flexible spacing.
    const re = new RegExp(`${label}\\s*:\\s*([^\\n\\r]+)`, "i");
    const match = text.match(re);
    return match ? match[1].trim().replace(/^["'<]|["'>]$/g, "") : "";
  };

  return {
    gender: extract("Gender") || extract("Gender presentation"),
    hair: extract("Hair") || extract("Hair length and style"),
    facialHair:
      extract("Facial hair") || extract("Beard") || extract("Beard description"),
    glasses: extract("Glasses") || extract("Eyewear"),
    skinTone: extract("Skin tone") || extract("Skin"),
  };
}
