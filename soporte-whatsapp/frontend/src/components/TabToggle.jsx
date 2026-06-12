// src/components/TabToggle.jsx
function TabToggle({ activeView, onViewChange }) {
    return (
        <div className="inline-flex rounded-full bg-secondary p-1">
            <button
                onClick={() => onViewChange("clientes")}
                className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
                    activeView === "clientes"
                        ? "bg-foreground text-card shadow-sm"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary/80"
                }`}
            >
                💬 Clientes
            </button>
            <button
                onClick={() => onViewChange("interno")}
                className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
                    activeView === "interno"
                        ? "bg-foreground text-card shadow-sm"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary/80"
                }`}
            >
                👥 Interno
            </button>
        </div>
    )
}

export default TabToggle