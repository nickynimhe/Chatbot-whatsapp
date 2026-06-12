// src/components/AdminTabs.jsx
function AdminTabs({ activeView, onViewChange }) {
    return (
        <div className="inline-flex rounded-full bg-secondary p-1">
            <button
                onClick={() => onViewChange("admin")}
                className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
                    activeView === "admin"
                        ? "bg-foreground text-card shadow-sm"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary/80"
                }`}
            >
                📊 Admin
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

export default AdminTabs