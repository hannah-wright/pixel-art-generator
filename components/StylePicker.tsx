"use client";

export interface Style {
  id: string;
  label: string;
  description: string;
  prompt: string;
}

interface StylePickerProps {
  styles: Style[];
  selected: string;
  onSelect: (id: string) => void;
}

export function StylePicker({ styles, selected, onSelect }: StylePickerProps) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {styles.map((s) => (
        <button
          key={s.id}
          onClick={() => onSelect(s.id)}
          className={`p-4 border-[3px] border-ink text-left transition-all ${
            selected === s.id
              ? "bg-blue text-white shadow-[2px_2px_0_0_#0a0a0a]"
              : "bg-paper hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[3px_3px_0_0_#0a0a0a]"
          }`}
        >
          <div className="font-pixel text-xl mb-1">{s.label}</div>
          <div className="text-xs opacity-80">{s.description}</div>
        </button>
      ))}
    </div>
  );
}
