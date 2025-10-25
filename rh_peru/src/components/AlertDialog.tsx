// src/components/AlertDialog.tsx
import React from "react";

interface Props {
  isOpen: boolean;
  title: string;
  message: string;
  isConfirm?: boolean; // Si es true, muestra botones de "Confirmar" y "Cancelar"
  onConfirm?: () => void; // Función a ejecutar al confirmar
  onClose: () => void; // Función para cerrar (o cancelar)
}

export default function AlertDialog({
  isOpen,
  title,
  message,
  isConfirm = false,
  onConfirm,
  onClose,
}: Props) {
  if (!isOpen) return null;

  const handleConfirmClick = () => {
    if (onConfirm) {
      onConfirm();
    }
    // No cerramos el modal aquí, la función onConfirm debería manejarlo
    // o el executeDelete en el padre.
  };

  return (
    // Overlay oscuro
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 transition-opacity duration-300">
      
      {/* Panel del modal con estilo "glassmorphism" */}
      <div className="bg-white/50 backdrop-blur-xl shadow-2xl rounded-2xl p-6 w-full max-w-sm relative transition-all transform scale-100 duration-300">
        
        <h2 className="text-xl font-bold mb-4 text-gray-900">{title}</h2>
        
        <p className="text-gray-800 mb-6">{message}</p>

        {/* Botones */}
        <div className="flex justify-end space-x-3">
          {isConfirm && (
            <button
              onClick={onClose}
              className="bg-white/40 hover:bg-white/60 text-gray-900 px-4 py-2 rounded-lg transition font-medium"
            >
              Cancelar
            </button>
          )}
          <button
            onClick={isConfirm ? handleConfirmClick : onClose}
            className={`${
              isConfirm
                ? "bg-red-600 hover:bg-red-700 text-white"
                : "bg-gray-900 hover:bg-gray-800 text-white"
            } px-4 py-2 rounded-lg transition font-semibold shadow-lg`}
          >
            {isConfirm ? "Confirmar" : "Aceptar"}
          </button>
        </div>
      </div>
    </div>
  );
}