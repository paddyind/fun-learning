import { Calculator, FlaskConical, BookOpen, Globe2, HelpCircle, type LucideIcon } from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  Calculator,
  FlaskConical,
  BookOpen,
  Globe2,
};

export function getSubjectIcon(name: string): LucideIcon {
  return ICONS[name] ?? HelpCircle;
}
