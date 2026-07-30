import "./NewVisitButton.css";
import { Plus } from "lucide-react";

export default function NewVisitButton() {
  return (
    <button className="new-visit-btn">
      <Plus size={24} />
      <span>زيارة جديدة</span>
    </button>
  );
}