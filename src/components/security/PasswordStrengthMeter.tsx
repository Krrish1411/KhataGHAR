import React from 'react';
import { evaluatePasswordStrength, isAcceptablePassword } from '../../services/crypto';
import { cn } from '../../utils/cn';
import { ShieldCheck, ShieldAlert } from 'lucide-react';

interface PasswordStrengthMeterProps {
  password?: string;
  showFeedback?: boolean;
}

export const PasswordStrengthMeter: React.FC<PasswordStrengthMeterProps> = ({
  password = '',
  showFeedback = true,
}) => {
  const strength = evaluatePasswordStrength(password);
  const acceptability = isAcceptablePassword(password);

  if (!password) return null;

  return (
    <div className="space-y-2 mt-2.5 p-2.5 rounded-xl bg-moss/50 border border-line">
      <div className="flex items-center justify-between text-xs">
        <span className="text-ink/65 font-medium">Password Strength:</span>
        <span className="font-bold text-ink">{strength.label}</span>
      </div>

      <div className="grid grid-cols-4 gap-1.5 h-1.5">
        {[0, 1, 2, 3].map((step) => (
          <div
            key={step}
            className={cn(
              'h-full rounded-full transition-all duration-300',
              step <= strength.score ? strength.color : 'bg-slate-200 dark:bg-white/10'
            )}
          />
        ))}
      </div>

      {acceptability.valid ? (
        <div className="flex items-center gap-1.5 text-[11.5px] font-semibold text-pine-700 dark:text-pine-400">
          <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
          <span>High-End Security Met (Zero-Knowledge Immune)</span>
        </div>
      ) : (
        <div className="flex items-start gap-1.5 text-[11.5px] font-semibold text-flare-600 dark:text-flare-400">
          <ShieldAlert className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>{acceptability.reason || 'High-entropy password required (min 10 chars, uppercase, lowercase, numbers, symbols)'}</span>
        </div>
      )}

      {showFeedback && strength.feedback.length > 0 && (
        <ul className="text-[11px] text-ink/60 space-y-0.5 list-disc list-inside mt-1">
          {strength.feedback.map((item, idx) => (
            <li key={idx}>{item}</li>
          ))}
        </ul>
      )}
    </div>
  );
};
