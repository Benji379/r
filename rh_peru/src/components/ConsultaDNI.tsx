// src/components/ConsultaDNI.tsx
import { useState } from "react";
import { apiClient } from "../api/apiClient";
// (ELIMINADO) useAuth ya no es necesario si no se usa logout
// import { useAuth } from "../context/AuthContext"; 
import AlertDialog from "./AlertDialog"; // <-- 1. IMPORTAR DIÁLOGO

// Diccionario para mostrar nombres de campos más legibles (SIN CAMBIOS)
const LABELS: Record<string, string> = {
  dni: "DNI",
  nombres: "Nombres",
  ap_pat: "Apellido paterno",
  ap_mat: "Apellido materno",
  direccion: "Dirección",
  fecha_nac: "Fecha de nacimiento",
  fch_inscripcion: "Fecha de inscripción",
  fch_emision: "Fecha de emisión",
  fch_caducidad: "Fecha de caducidad",
  ubigeo_nac: "Ubigeo de nacimiento",
  ubigeo_dir: "Ubigeo de dirección",
  sexo: "Sexo",
  est_civil: "Estado civil",
  dig_ruc: "Dígito RUC",
  madre: "Nombre de la madre",
  padre: "Nombre del padre",
};

// --- 2. AÑADIR INTERFAZ Y ESTADO INICIAL PARA DIÁLOGO ---
interface DialogState {
  isOpen: boolean;
  title: string;
  message: string;
}

const INITIAL_DIALOG_STATE: DialogState = {
  isOpen: false,
  title: "",
  message: "",
};
// --- FIN DE AÑADIDOS ---

export default function ConsultaDNI() {
  const [dni, setDni] = useState("");
  const [nombres, setNombres] = useState("");
  const [apPat, setApPat] = useState("");
  const [apMat, setApMat] = useState("");
  const [resultado, setResultado] = useState<any | null>(null);
  const [tipoBusqueda, setTipoBusqueda] = useState<"dni" | "nombre">("dni");
  const [loading, setLoading] = useState(false);
  // const { logout } = useAuth(); // Declarado pero no usado

  // --- 3. AÑADIR ESTADO Y HELPERS PARA DIÁLOGO ---
  const [dialog, setDialog] = useState<DialogState>(INITIAL_DIALOG_STATE);

  const closeDialog = () => {
    setDialog(INITIAL_DIALOG_STATE);
  };

  const showInfoDialog = (title: string, message: string) => {
    setDialog({
      isOpen: true,
      title,
      message,
    });
  };
  // --- FIN DE HELPERS ---

  const handleBuscar = async () => {
    try {
      setLoading(true);
      let res;

      if (tipoBusqueda === "dni") {
        if (!dni.trim()) {
          // <-- 4. REEMPLAZAR ALERT
          showInfoDialog("Campo vacío", "Por favor, ingrese un DNI válido.");
          setLoading(false); // Detener carga
          return;
        }
        res = await apiClient.get(`/consulta?dni=${dni}`);
      } else {
        if (!nombres.trim() || !apPat.trim() || !apMat.trim()) {
          // <-- 5. REEMPLAZAR ALERT
          showInfoDialog(
            "Campos incompletos",
            "Por favor, ingrese nombres y apellidos completos."
          );
          setLoading(false); // Detener carga
          return;
        }
        const params = new URLSearchParams({
          nombres,
          ap_pat: apPat,
          ap_mat: apMat,
        });
        res = await apiClient.get(`/consulta-nombres?${params.toString()}`);
      }

      const data = Array.isArray(res.data.data)
        ? res.data.data[0]
        : res.data.data;

      // (NUEVO) Mostrar diálogo si no hay resultados
      if (!data || Object.keys(data).length === 0) {
        showInfoDialog("Sin resultados", "No se encontró información para la búsqueda.");
      }

      setResultado(data || {});
    } catch (err: any) {
      console.error(err);
      // <-- 6. REEMPLAZAR ALERT
      const errorMsg =
        err.response?.data?.error || "Ocurrió un error en la consulta.";
      showInfoDialog("Error", errorMsg); //
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (!loading) {
        handleBuscar();
      }
    }
  };

  // Función de validación de DNI (SIN CAMBIOS)
  const handleDniChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const regex = /^[0-9\b]*$/;
    if (value === "" || regex.test(value)) {
      setDni(value);
    }
  };

  // Función de formato (SIN CAMBIOS)
  const formatResultado = (key: string, value: any): string => {
    const strValue = String(value);

    if (key === "sexo") {
      if (strValue === "1") return "M";
      if (strValue === "2") return "F";
    }

    if (key === "est_civil") {
      if (strValue.toUpperCase().trim() === "VACIO") return "SOLTERO";
    }
    return strValue;
  };

  return (
    // Contenedor principal (con z-index relativo para el diálogo)
    <div className="relative z-0 bg-white/30 backdrop-blur-lg shadow-xl rounded-2xl p-8 w-full max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Consultas RENIEC</h2>
      </div>

      {/* Tipo de búsqueda */}
      <div className="mb-4">
        <label className="block mb-2 text-sm font-medium text-gray-800">
          Tipo de búsqueda:
        </label>
        <select
          value={tipoBusqueda}
          onChange={(e) => setTipoBusqueda(e.target.value as any)}
          className="w-full p-3 bg-white/60 border border-white/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-900"
        >
          <option value="dni">Por DNI</option>
          <option value="nombre">Por Nombres y Apellidos</option>
        </select>
      </div>

      {/* Campos de entrada (SIN CAMBIOS) */}
      {tipoBusqueda === "dni" ? (
        <input
          type="tel"
          inputMode="numeric"
          value={dni}
          onChange={handleDniChange}
          onKeyDown={handleKeyDown}
          placeholder="Ingrese DNI"
          className="w-full p-3 bg-white/60 border border-white/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder-gray-500 text-gray-900 mb-3"
        />
      ) : (
        <div className="grid sm:grid-cols-3 gap-3 mb-3">
          <input
            type="text"
            value={nombres}
            onChange={(e) => setNombres(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Nombres"
            className="w-full p-3 bg-white/60 border border-white/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder-gray-500 text-gray-900"
          />
          <input
            type="text"
            value={apPat}
            onChange={(e) => setApPat(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Apellido Paterno"
            className="w-full p-3 bg-white/60 border border-white/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder-gray-500 text-gray-900"
          />
          <input
            type="text"
            value={apMat}
            onChange={(e) => setApMat(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Apellido Materno"
            className="w-full p-3 bg-white/60 border border-white/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder-gray-500 text-gray-900"
          />
        </div>
      )}

      {/* Botón de búsqueda (SIN CAMBIOS) */}
      <button
        onClick={handleBuscar}
        disabled={loading}
        className="w-full bg-gray-900 text-white py-3 rounded-lg hover:bg-gray-800 transition font-semibold shadow-lg disabled:opacity-50"
      >
        {loading ? "Buscando..." : "Buscar"}
      </button>

      {/* Resultado (SIN CAMBIOS) */}
      {resultado && Object.keys(resultado).length > 0 && (
        <div className="mt-6 bg-white/20 p-6 rounded-lg border border-white/30">
          <h3 className="font-semibold mb-4 text-gray-900 text-lg">
            Resultado:
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            {Object.entries(resultado).map(([key, value]) => (
              <div
                key={key}
                className="p-3 rounded-md bg-white/30 border border-white/40 transition"
              >
                <p className="text-gray-700 text-xs uppercase font-semibold mb-1">
                  {LABELS[key] || key.replace(/_/g, " ")}
                </p>
                <p className="text-gray-900 font-medium break-words">
                  {formatResultado(key, value)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- 7. RENDERIZAR EL DIÁLOGO --- */}
      <AlertDialog
        isOpen={dialog.isOpen}
        title={dialog.title}
        message={dialog.message}
        onClose={closeDialog}
        isConfirm={false} // Este diálogo solo informa, no confirma
      />
    </div>
  );
}