import { useEffect, useState } from "react"; // <-- IMPORTAR useEffect
import { apiClient } from "../api/apiClient";
import EditarUsuarioModal from "./EditarUsuarioModal";
import AlertDialog from "./AlertDialog"; // <-- IMPORTAR EL NUEVO DIÁLOGO

// --- (NUEVO) Definición de la interfaz para el estado del diálogo ---
interface DialogState {
  isOpen: boolean;
  title: string;
  message: string;
  isConfirm: boolean;
  onConfirm?: () => void;
}

const INITIAL_DIALOG_STATE: DialogState = {
  isOpen: false,
  title: "",
  message: "",
  isConfirm: false,
  onConfirm: undefined,
};

export default function RegisterForm() {
  // --- ESTADOS ORIGINALES ---
  const [form, setForm] = useState({
    username: "",
    nombre: "",
    apellido: "",
    password: "",
    role: "usuario",
  });
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [editando, setEditando] = useState<any | null>(null);

  // --- ESTADOS DE BÚSQUEDA Y PAGINACIÓN ---
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // --- (NUEVO) ESTADO PARA EL DIÁLOGO ---
  const [dialog, setDialog] = useState<DialogState>(INITIAL_DIALOG_STATE);

  // --- LÓGICA DE DATOS ---
  const fetchUsuarios = async () => {
    try {
      const res = await apiClient.get("/usuarios");
      if (res.data.success) setUsuarios(res.data.users);
    } catch (err) {
      console.error("Error al obtener usuarios:", err);
      // (NUEVO) Mostrar error con el diálogo
      showInfoDialog("Error de Red", "No se pudieron cargar los usuarios.");
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // --- (NUEVO) Helpers para el diálogo ---
  const closeDialog = () => {
    setDialog(INITIAL_DIALOG_STATE);
  };

  const showInfoDialog = (title: string, message: string) => {
    setDialog({
      isOpen: true,
      title,
      message,
      isConfirm: false,
      onConfirm: undefined,
    });
  };

  const showConfirmDialog = (
    title: string,
    message: string,
    onConfirm: () => void
  ) => {
    setDialog({
      isOpen: true,
      title,
      message,
      isConfirm: true,
      onConfirm,
    });
  };

  // --- LÓGICA DE ACCIONES (MODIFICADA) ---

  const handleRegistrar = async () => {
    try {
      await apiClient.post("/usuarios", form);
      // (MODIFICADO) Usar diálogo en lugar de alert
      showInfoDialog("Éxito", "Usuario registrado correctamente.");
      setForm({
        username: "",
        nombre: "",
        apellido: "",
        password: "",
        role: "usuario",
      });
      fetchUsuarios();
    } catch (err: any) {
      console.error(err);
      const errorMsg =
        err.response?.data?.error || "Error al registrar usuario";
      // (MODIFICADO) Usar diálogo en lugar de alert
      showInfoDialog("Error", errorMsg);
    }
  };

  // (MODIFICADO) Esta función ahora SOLO abre el diálogo de confirmación
  const handleEliminarClick = (username: string) => {
    showConfirmDialog(
      "Confirmar Eliminación",
      `¿Seguro que quieres eliminar permanentemente a "${username}"? Esta acción no se puede deshacer.`,
      () => executeDelete(username) // Pasa la función de borrado real
    );
  };

  // (NUEVO) Esta función contiene la lógica de borrado que antes estaba en handleEliminar
  const executeDelete = async (username: string) => {
    try {
      await apiClient.delete(`/usuarios/${username}`);
      showInfoDialog("Éxito", "Usuario eliminado correctamente.");
      fetchUsuarios(); // Recargar la lista
    } catch (err: any) {
      console.error("Error al eliminar usuario:", err);
      const errorMsg =
        err.response?.data?.error ||
        "Ocurrió un error desconocido al eliminar el usuario.";
      showInfoDialog("Error", errorMsg);
    }
    closeDialog(); // Cierra el diálogo de confirmación después de la acción
  };

  // --- (¡NUEVO!) CARGAR USUARIOS AL INICIO ---
  useEffect(() => {
    fetchUsuarios();
  }, []); // El array vacío asegura que se ejecute solo al montar

  // --- LÓGICA DE FILTRADO Y PAGINACIÓN (Sin cambios) ---
  const filteredUsers = usuarios.filter((u) => {
    //... (lógica de filtrado igual)
    const searchLower = searchTerm.toLowerCase();
    return (
      (u.username && u.username.toLowerCase().includes(searchLower)) ||
      (u.nombre && u.nombre.toLowerCase().includes(searchLower)) ||
      (u.apellido && u.apellido.toLowerCase().includes(searchLower)) ||
      (u.role && u.role.toLowerCase().includes(searchLower))
    );
  });

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentUsers = filteredUsers.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handleItemsPerPageChange = (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    setItemsPerPage(Number(e.target.value));
    setCurrentPage(1);
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) setCurrentPage((prev) => prev - 1);
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) setCurrentPage((prev) => prev + 1);
  };

  // --- Helpers de formato (Sin cambios) ---
  const formatRole = (role: string) => {
    if (role === "admin") return "Administrador";
    if (role === "analista") return "Analista";
    if (role === "usuario") return "Usuario";
    return role;
  };

  const getRoleClass = (role: string) => {
    switch (role) {
      case "admin":
        return "font-semibold text-blue-800";
      case "analista":
        return "font-semibold text-green-800";
      case "usuario":
        return "text-gray-700";
      default:
        return "text-red-600";
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* --- Panel 1: Formulario de Registro (Sin cambios visuales) --- */}
      <div className="bg-white/30 backdrop-blur-lg shadow-xl rounded-2xl p-6 w-full">
        {/* ... (Todo el JSX del formulario de registro igual) ... */}
         <h2 className="text-xl font-bold mb-4 text-center text-gray-900">
          Registrar Nuevo Usuario
        </h2>
        <div className="flex flex-col lg:flex-row gap-4 items-end">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 w-full flex-grow">
            <input
              type="text"
              name="username"
              placeholder="Username"
              value={form.username}
              onChange={handleChange}
              className="w-full p-3 bg-white/60 border border-white/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder-gray-500 text-gray-900"
            />
            <input
              type="text"
              name="nombre"
              placeholder="Nombre"
              value={form.nombre}
              onChange={handleChange}
              className="w-full p-3 bg-white/60 border border-white/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder-gray-500 text-gray-900"
            />
            <input
              type="text"
              name="apellido"
              placeholder="Apellido"
              value={form.apellido}
              onChange={handleChange}
              className="w-full p-3 bg-white/60 border border-white/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder-gray-500 text-gray-900"
            />
            <input
              type="password"
              name="password"
              placeholder="Contraseña"
              value={form.password}
              onChange={handleChange}
              className="w-full p-3 bg-white/60 border border-white/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder-gray-500 text-gray-900"
            />
            <select
              name="role"
              value={form.role}
              onChange={handleChange}
              className="w-full p-3 bg-white/60 border border-white/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-900"
            >
              <option value="usuario">Usuario</option>
              <option value="analista">Analista</option>
              <option value="admin">Administrador</option>
            </select>
          </div>
          <button
            onClick={handleRegistrar}
            className="w-full lg:w-auto bg-gray-900 text-white p-3 rounded-lg hover:bg-gray-800 transition font-semibold shadow-lg flex-shrink-0"
          >
            Registrar
          </button>
        </div>
      </div>

      {/* --- Panel 2: Lista de Usuarios (Con onClick modificado) --- */}
      <div className="bg-white/30 backdrop-blur-lg shadow-xl rounded-2xl p-6 md:p-8 w-full">
        <h2 className="text-2xl font-bold mb-6 text-center text-gray-900">
          Usuarios Registrados
        </h2>

        {/* ... (Controles de Búsqueda y Paginación igual) ... */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4">
          <div className="relative w-full md:w-1/3">
            <input
              type="text"
              placeholder="Buscar por usuario, nombre, rol..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="w-full p-2 pl-10 bg-white/60 border border-white/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder-gray-500 text-gray-900"
            />
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 absolute left-3 top-2.5 text-gray-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-800">
            <span>Mostrar:</span>
            <select
              value={itemsPerPage}
              onChange={handleItemsPerPageChange}
              className="p-2 bg-white/60 border border-white/30 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-gray-900"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>


        {/* Lista de Usuarios */}
        <div className="space-y-3 mb-6">
          {currentUsers.length > 0 ? (
            currentUsers.map((u) => (
              <div
                key={u.username}
                className="py-3 px-4 flex flex-col sm:flex-row justify-between items-center bg-white/20 rounded-lg border border-white/30 gap-3"
              >
                <div className="text-center sm:text-left">
                  <p className="font-medium text-gray-900">{u.username}</p>
                  <p className="text-sm text-gray-800">
                    {u.nombre} {u.apellido} —{" "}
                    <span className={getRoleClass(u.role)}>
                      {formatRole(u.role)}
                    </span>
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditando(u)}
                    className="bg-white/40 hover:bg-white/60 text-gray-900 px-3 py-1 rounded-lg transition font-medium text-sm"
                  >
                    Editar
                  </button>
                  <button
                    // (MODIFICADO) Cambiar a la función que abre el diálogo
                    onClick={() => handleEliminarClick(u.username)}
                    className="bg-red-600/70 hover:bg-red-700/70 text-white px-3 py-1 rounded-lg transition font-medium text-sm"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            ))
          ) : (
            <p className="text-center text-gray-600 py-4">
              {usuarios.length === 0 ? "Cargando usuarios..." : "No se encontraron usuarios."}
            </p>
          )}
        </div>

        {/* ... (Controles de Paginación Inferior igual) ... */}
         {filteredUsers.length > 0 && (
          <div className="flex justify-between items-center text-sm text-gray-800">
            <div>
              Mostrando {indexOfFirstItem + 1} -{" "}
              {Math.min(indexOfLastItem, filteredUsers.length)} de{" "}
              {filteredUsers.length}
            </div>
            <div className="flex gap-2">
              <button
                onClick={goToPreviousPage}
                disabled={currentPage === 1}
                className="px-3 py-1 bg-white/40 border border-white/30 rounded-lg disabled:opacity-50 hover:bg-white/60 transition"
              >
                Anterior
              </button>
              <span className="flex items-center px-2">
                Página {currentPage} de {totalPages}
              </span>
              <button
                onClick={goToNextPage}
                disabled={currentPage === totalPages || totalPages === 0}
                className="px-3 py-1 bg-white/40 border border-white/30 rounded-lg disabled:opacity-50 hover:bg-white/60 transition"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal de Edición (Sin cambios) */}
      {editando && (
        <EditarUsuarioModal
          usuario={editando}
          onClose={() => setEditando(null)}
          onSaved={fetchUsuarios}
        />
      )}

      {/* (NUEVO) Renderizar el componente de Diálogo */}
      <AlertDialog
        isOpen={dialog.isOpen}
        title={dialog.title}
        message={dialog.message}
        isConfirm={dialog.isConfirm}
        onClose={closeDialog}
        onConfirm={dialog.onConfirm}
      />
    </div>
  );
}