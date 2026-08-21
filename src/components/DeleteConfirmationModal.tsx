import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import { MortEvaluationRecord } from '../types';

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  recordsToDelete: MortEvaluationRecord[];
  onConfirm: () => void;
  onCancel: () => void;
}

export const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
  isOpen,
  recordsToDelete,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen || recordsToDelete.length === 0) return null;

  const isMultiple = recordsToDelete.length > 1;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
      <div
        className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-[#D1D1C7] overflow-hidden p-6 space-y-5"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-start gap-4">
          <div className="p-3 bg-red-100 text-red-700 rounded-2xl shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-serif font-bold text-[#134E4A]">
              {isMultiple
                ? `Eliminar ${recordsToDelete.length} registres d'avaluació?`
                : `Eliminar el registre ${recordsToDelete[0].code}?`}
            </h3>
            <p className="text-xs text-[#5C6B5E] mt-1 leading-relaxed">
              {isMultiple
                ? `Aquesta acció eliminarà definitivament els ${recordsToDelete.length} registres seleccionats de la base de dades local. Aquesta acció no es pot desfer.`
                : `S'eliminarà de l'inventari el mort ${recordsToDelete[0].code} (${recordsToDelete[0].locationName}). Aquesta acció no es pot desfer.`}
            </p>
          </div>
          <button
            onClick={onCancel}
            className="text-[#7A8A7C] hover:text-[#134E4A] p-1 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* List of items being deleted */}
        <div className="bg-[#FAF9F6] border border-[#D1D1C7] rounded-2xl p-3 max-h-36 overflow-y-auto space-y-1.5 text-xs font-mono">
          {recordsToDelete.map((r) => (
            <div key={r.id} className="flex items-center justify-between text-[#134E4A] py-1 border-b border-[#E9E9E0] last:border-none">
              <span className="font-bold">{r.code}</span>
              <span className="text-[#5C6B5E] truncate max-w-[200px] text-right font-sans">{r.locationName}</span>
            </div>
          ))}
        </div>

        {/* Action buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 rounded-full text-xs font-semibold text-[#134E4A] bg-[#FAF9F6] hover:bg-[#E9E9E0] border border-[#D1D1C7] transition"
          >
            Cancel·lar
          </button>
          <button
            type="button"
            id="btn-confirm-delete"
            onClick={onConfirm}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-semibold text-white bg-red-700 hover:bg-red-800 transition shadow-xs"
          >
            <Trash2 className="w-4 h-4" />
            <span>{isMultiple ? `Eliminar ${recordsToDelete.length} registres` : 'Eliminar definitivament'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
