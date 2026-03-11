import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check, X } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Option {
  id: string;
  label: string;
  sublabel?: string;
}

interface AutoFilterSelectProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
}

export const AutoFilterSelect = ({ options, value, onChange, placeholder = "Sélectionner...", label }: AutoFilterSelectProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(opt => opt.id === value);

  const filteredOptions = options.filter(opt => 
    opt.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    opt.sublabel?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="w-full" ref={containerRef}>
      {label && <label className="label-sm">{label}</label>}
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "w-full flex items-center justify-between px-4 py-2.5 bg-neutral-50 border rounded-sm transition-all text-sm focus:outline-none",
            isOpen ? "border-[#B45309] bg-white ring-4 ring-[#B45309]/5" : "border-neutral-200 hover:border-neutral-300"
          )}
        >
          <span className={selectedOption ? "text-neutral-900 font-medium" : "text-neutral-400"}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <ChevronDown size={18} className={cn("text-neutral-400 transition-transform duration-200", isOpen && "rotate-180 text-[#B45309]")} />
        </button>

        {isOpen && (
          <div className="absolute z-50 w-full mt-2 bg-white border border-neutral-200 rounded-sm shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-2 border-b border-neutral-100 bg-neutral-50/50">
              <div className="input-icon-wrapper">
                <input
                  autoFocus
                  type="text"
                  className="input-field pl-10 py-2 text-xs"
                  placeholder="Rechercher..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <Search className="input-icon left-3" size={14} />
              </div>
            </div>
            <div className="max-h-60 overflow-y-auto">
              {filteredOptions.length > 0 ? (
                filteredOptions.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => {
                      onChange(option.id);
                      setIsOpen(false);
                      setSearchTerm('');
                    }}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2 text-left text-sm hover:bg-[#B45309]/5 transition-colors",
                      value === option.id && "bg-[#B45309]/5 text-[#B45309] font-medium"
                    )}
                  >
                    <div>
                      <div>{option.label}</div>
                      {option.sublabel && <div className="text-[10px] text-neutral-400">{option.sublabel}</div>}
                    </div>
                    {value === option.id && <Check size={14} />}
                  </button>
                ))
              ) : (
                <div className="px-3 py-4 text-center text-xs text-neutral-400">
                  Aucun résultat
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
