import { AnnotationMode } from "@/app/annotation/page";
import { Download, Hand, Hexagon, Menu, Redo, Ruler, StickyNote, Trash2, Undo, Upload, X } from "lucide-react";
import { useState } from "react";

export default function ToolBar({
  setMode,
  clearAll,
  mode,
  canUndo = false,
  canRedo = false,
  exportToJson,
  importFromJson
}: {
  setMode: (value: AnnotationMode) => void;
  clearAll: () => void;
  mode: AnnotationMode;
  canUndo?: boolean;
  canRedo?: boolean;
  exportToJson: () => void;
  importFromJson: (event: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const getActiveModeIcon = () => {
    switch (mode) {
      case "measure":
        return <Ruler className="w-4 h-4 sm:w-5 sm:h-5 text-white" />;
      case "polygon":
        return <Hexagon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />;
      case "annotate":
        return <StickyNote className="w-4 h-4 sm:w-5 sm:h-5 text-white" />;
      default:
        return null;
    }
  };

  return (
    <div className="flex justify-center items-center">
      <div
        className="fixed bottom-6 left-1/2 transform -translate-x-1/2 
          w-[90%] max-w-[470px] flex justify-between items-center gap-2 
          bg-gray-800/30 p-2 rounded-lg shadow-lg border border-gray-700 backdrop-blur-md"
      >
        <button
          onClick={() => setMode(null)}
          className="flex items-center justify-center p-2 rounded-md transition-all 
            bg-black text-white hover:bg-gray-700 cursor-pointer relative group"
          title="Reset Mode"
        >
          <Hand className="w-4 h-4 sm:w-5 sm:h-5" />
          <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 
            bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity">
            scroll
          </span>
        </button>

        <div
          className={`sm:hidden flex items-center justify-center px-3 py-2 rounded-md ${mode ? "bg-black text-white" : "bg-transparent"
            }`}
          title={mode ? mode.charAt(0).toUpperCase() + mode.slice(1) : "Select Mode"}
        >
          {getActiveModeIcon()}
        </div>

        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="sm:hidden flex items-center justify-center p-2 rounded-md transition-all 
            bg-black text-white hover:bg-gray-700 cursor-pointer"
        >
          {isMenuOpen ? (
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          ) : (
            <Menu className="w-4 h-4 sm:w-5 sm:h-5" />
          )}
        </button>

        {isMenuOpen && (
          <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 w-[90%] max-w-[450px] 
            flex flex-wrap gap-2 justify-evenly bg-gray-800/30 p-2 rounded-lg shadow-lg border border-gray-700 backdrop-blur-md">
            <button
              onClick={() => {
                setMode("undo");
                setIsMenuOpen(false);
              }}
              disabled={!canUndo}
              className={`flex items-center justify-center gap-2 p-2 rounded-md transition-all 
                ${canUndo ? 'bg-black text-white hover:bg-gray-700' : 'bg-gray-800 text-gray-500'} 
                cursor-pointer relative group flex-grow`}
              title="Undo"
            >
              <Undo className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 
                bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity">
                Undo
              </span>
            </button>

            <button
              onClick={() => {
                setMode("redo");
                setIsMenuOpen(false);
              }}
              disabled={!canRedo}
              className={`flex items-center justify-center gap-2 p-2 rounded-md transition-all 
                ${canRedo ? 'bg-black text-white hover:bg-gray-700' : 'bg-gray-800 text-gray-500'} 
                cursor-pointer relative group flex-grow`}
              title="Redo"
            >
              <Redo className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 
                bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity">
                Redo
              </span>
            </button>

            <button
              onClick={() => {
                setMode("measure");
                setIsMenuOpen(false);
              }}
              className="flex items-center justify-center gap-2 p-2 rounded-md transition-all 
                bg-black text-white hover:bg-gray-700 cursor-pointer relative group flex-grow"
              title="Measure"
            >
              <Ruler className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 
                bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity">
                Measure
              </span>
            </button>

            <button
              onClick={() => {
                setMode("polygon");
                setIsMenuOpen(false);
              }}
              className="flex items-center justify-center gap-2 p-2 rounded-md transition-all 
                bg-black text-white hover:bg-gray-700 cursor-pointer relative group flex-grow"
              title="Polygon"
            >
              <Hexagon className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 
                bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity">
                Polygon
              </span>
            </button>

            <button
              onClick={() => {
                setMode("annotate");
                setIsMenuOpen(false);
              }}
              className="flex items-center justify-center gap-2 p-2 rounded-md transition-all 
                bg-black text-white hover:bg-gray-700 cursor-pointer relative group flex-grow"
              title="Annotate"
            >
              <StickyNote className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 
                bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity">
                Annotate
              </span>
            </button>

            <button
              onClick={() => {
                clearAll();
                setIsMenuOpen(false);
              }}
              className="flex items-center justify-center gap-2 p-2 rounded-md transition-all 
                bg-red-500 text-white hover:bg-red-600 cursor-pointer relative group flex-grow"
              title="Clear All"
            >
              <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-2 py-1 
                bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity">
                Clear All
              </span>
            </button>
          </div>
        )}

        <div className="hidden sm:flex justify-between gap-2 sm:gap-16">
          <div className="flex gap-2">
            <button
              onClick={() => setMode("undo")}
              disabled={!canUndo}
              className={`flex items-center justify-center p-2 sm:p-2.5 rounded-md transition-all 
                ${canUndo ? 'bg-black text-white hover:bg-gray-700' : 'bg-gray-800 text-gray-500'} 
                cursor-pointer`}
              title="Undo"
            >
              <Undo className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            <button
              onClick={() => setMode("redo")}
              disabled={!canRedo}
              className={`flex items-center justify-center p-2 sm:p-2.5 rounded-md transition-all 
                ${canRedo ? 'bg-black text-white hover:bg-gray-700' : 'bg-gray-800 text-gray-500'} 
                cursor-pointer`}
              title="Redo"
            >
              <Redo className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>

          <div className="flex gap-2 sm:gap-3">
            <button
              onClick={() => setMode("measure")}
              className={`flex items-center justify-center p-2 sm:p-2.5 rounded-md transition-all 
                ${mode === "measure"
                  ? "bg-gray-400 text-black"
                  : "bg-black text-white hover:bg-gray-700"
                } cursor-pointer relative group`}
              title="Measure"
            >
              <Ruler className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            <button
              onClick={() => setMode("polygon")}
              className={`flex items-center justify-center p-2 sm:p-2.5 rounded-md transition-all 
                ${mode === "polygon"
                  ? "bg-gray-400 text-black"
                  : "bg-black text-white hover:bg-gray-700"
                } cursor-pointer relative group`}
              title="Polygon"
            >
              <Hexagon className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            <button
              onClick={() => setMode("annotate")}
              className={`flex items-center justify-center p-2 sm:p-2.5 rounded-md transition-all 
                ${mode === "annotate"
                  ? "bg-gray-400 text-black"
                  : "bg-black text-white hover:bg-gray-700"
                } cursor-pointer relative group`}
              title="Annotate"
            >
              <StickyNote className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>

          <div className="flex gap-2 sm:gap-3">
            <button
              onClick={clearAll}
              className="flex items-center justify-center p-2 sm:p-2.5 rounded-md transition-all 
                bg-red-500 text-white hover:bg-red-600 cursor-pointer"
              title="Clear All"
            >
              <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="absolute top-5 right-4 flex gap-2">
        <button
          onClick={exportToJson}
          className="flex items-center justify-center p-2 rounded-md transition-all 
      bg-black text-white hover:bg-gray-700 cursor-pointer relative group"
          title="Export Annotations"
        >
          <Download className="w-4 h-4 sm:w-5 sm:h-5" />
          <span className="absolute bottom-full right-0 mt-4 px-2 py-1 
      bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
            Export Annotations
          </span>
        </button>

        <label className="flex items-center justify-center p-3 rounded-md transition-all 
    bg-black text-white hover:bg-gray-700 cursor-pointer relative group">
          <Upload className="w-4 h-4 sm:w-5 sm:h-5" />
          <input
            type="file"
            accept=".json"
            onChange={importFromJson}
            className="hidden"
          />
          <span className="absolute bottom-full right-0 mt-4 px-2 py-1 
      bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
            Import Annotations
          </span>
        </label>
      </div>
    </div>
  );
}