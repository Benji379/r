import { useState } from "react";
import { apiClient } from "../api/apiClient";

interface Props {
  usuario: any;
  onClose: () => void;
  onSaved: () => void;
}

const CAMPOS_DISPONIBLES = [
  "dni",
  "nombres",
  "ap_pat",
  "ap_mat",
  "fecha_nac",
  "direccion",
  "sexo",
  "est_civil",
  "madre",
  "padre",
];

export default function EditarUsuarioModal({
  usuario,
  onClose,
  onSaved,
}: Props) {
  // --- LÓGICA ORIGINAL (SIN CAMBIOS) ---
  const [username, setUsername] = useState(usuario.username);
  const [nombre, setNombre] = useState(usuario.nombre);
  const [apellido, setApellido] = useState(usuario.apellido);
  const [password, setPassword] = useState(usuario.password || "");
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [role, setRole] = useState(usuario.role);
  const [allowedFields, setAllowedFields] = useState<string[]>(
    usuario.allowedFields || []
  );
  const [mensaje, setMensaje] = useState<string | null>(null);

  const toggleField = (campo: string) => {
    setAllowedFields((prev) =>
      prev.includes(campo) ? prev.filter((f) => f !== campo) : [...prev, campo]
    );
  };

  const handleGuardar = async () => {
    try {
      const payload: any = {
        username,
        nombre,
        apellido,
        role,
        allowedFields,
      };
      if (password.trim() !== "") payload.password = password;

      const { data } = await apiClient.patch(
        `/usuarios/${usuario.username}`,
        payload
      );
      if (data.success) {
        setMensaje("✅ Usuario actualizado correctamente");
        setTimeout(() => {
          onSaved();
          onClose();
        }, 1000);
      } else {
        setMensaje("⚠️ Error al actualizar usuario");
      }
    } catch (err) {
      console.error(err);
      setMensaje("❌ Error al guardar los cambios");
    }
  };
  // --- FIN DE LÓGICA ORIGINAL ---

  return (
    // Overlay oscuro original del modal
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50 p-4">
      
      {/* Panel del modal con estilo "glassmorphism" */}
      <div className="bg-white/30 backdrop-blur-lg shadow-xl rounded-2xl p-8 w-full max-w-md relative">
        
        <h2 className="text-2xl font-bold mb-6 text-center text-gray-900">
          Editar usuario
        </h2>

        {/* Username */}
        <label className="block mb-2 text-sm font-medium text-gray-800">
          Nombre de usuario
        </label>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full p-3 bg-white/60 border border-white/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder-gray-500 text-gray-900 mb-3"
        />

        {/* Nombre */}
        <label className="block mb-2 text-sm font-medium text-gray-800">Nombre</label>
        <input
          type="text"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          className="w-full p-3 bg-white/60 border border-white/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder-gray-500 text-gray-900 mb-3"
        />

        {/* Apellido */}
        <label className="block mb-2 text-sm font-medium text-gray-800">Apellido</label>
        <input
          type="text"
          value={apellido}
          onChange={(e) => setApellido(e.target.value)}
          className="w-full p-3 bg-white/60 border border-white/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder-gray-500 text-gray-900 mb-3"
        />

        {/* Contraseña (LÍNEA CORREGIDA) */}
        <label className="block mb-2 text-sm font-medium text-gray-800">Contraseña</label>
        <div className="relative mb-4">
          <input
            type={mostrarPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={
              usuario.password ? "••••••••" : "Dejar en blanco para no cambiar"
            }
            className="w-full p-3 pr-10 bg-white/60 border border-white/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder-gray-500 text-gray-900"
          />

          <button
            type="button"
            onClick={() => setMostrarPassword((p) => !p)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-700 hover:text-gray-900"
          >
            {mostrarPassword ? "🙈" : "👁️"}
          </button>
        </div>

        {/* Rol */}
        <label className="block mb-2 text-sm font-medium text-gray-800">Rol</label>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="w-full p-3 bg-white/60 border border-white/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-900 mb-4"
        >
          <option value="usuario">Usuario</option>
          <option value="analista">Analista</option>
          <option value="admin">Administrador</option>
        </select>

        {/* Campos visibles */}
        <h3 className="font-semibold mb-2 text-gray-800 text-sm">
          Campos permitidos en API:
        </h3>
        <div className="grid grid-cols-2 gap-2 mb-4 text-sm text-gray-800">
          {CAMPOS_DISPONIBLES.map((campo) => (
            <label key={campo} className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={allowedFields.includes(campo)}
                onChange={() => toggleField(campo)}
                className="rounded text-blue-600 focus:ring-blue-400"
              />
              <span className="select-none">{campo}</span>
            </label>
          ))}
        </div>

        {/* Mensaje de estado */}
        {mensaje && (
          <div
            className={`text-center text-sm mb-3 font-medium ${
              mensaje.includes("✅")
                ? "text-green-800"
                : mensaje.includes("⚠️")
                ? "text-yellow-700"
                : "text-red-800"
            }`}
          >
            {mensaje}
          </div>
        )}

        {/* Botones */}
        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="bg-white/40 hover:bg-white/60 text-gray-900 px-4 py-2 rounded-lg transition font-medium"
          >
            Cancelar
          </button>
          <button
            onClick={handleGuardar}
            className="bg-gray-900 hover:bg-gray-800 text-white px-4 py-2 rounded-lg transition font-semibold shadow-lg"
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}