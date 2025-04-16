import { Hexagon, Ruler, StickyNote, Trash2 } from "lucide-react";

type AnnotationMode = "measure" | "polygon" | "annotate" | null;

export default function ToolBar({
  setMode,
  clearAll,
  mode,
}: {
  setMode: (value: AnnotationMode) => void;
  clearAll: () => void;
  mode: AnnotationMode;
}) {
  return (
    <div className="flex justify-center items-center">
    <div
      className="fixed bottom-6 left-1/2 transform -translate-x-1/2 
        sm:w-[90%] md:w-[650px] flex flex-col sm:flex-row justify-center items-center gap-4 
        bg-gray-800 p-3 rounded-full shadow-lg border border-gray-700"
    >
      <button
        onClick={() => setMode("measure")}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-md transition-colors 
          sm:w-auto w-full 
          ${
            mode === "measure"
              ? "bg-gray-400 text-black"
              : "bg-black text-white hover:bg-gray-700"
          } font-medium`}
      >
        <Ruler className="w-5 h-5" />
        <span>Measure</span>
      </button>
  
      <button
        onClick={() => setMode("polygon")}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-md transition-colors 
          sm:w-auto w-full 
          ${
            mode === "polygon"
              ? "bg-gray-400 text-black"
              : "bg-black text-white hover:bg-gray-700"
          } font-medium`}
      >
        <Hexagon className="w-5 h-5" />
        <span>Polygon</span>
      </button>
  
      <button
        onClick={() => setMode("annotate")}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-md transition-colors 
          sm:w-auto w-full 
          ${
            mode === "annotate"
              ? "bg-gray-400 text-black"
              : "bg-black text-white hover:bg-gray-700"
          } font-medium`}
      >
        <StickyNote className="w-5 h-5" />
        <span>Annotate</span>
      </button>
  
      <div className="mx-1 w-px h-8 bg-gray-600 self-center sm:block hidden"></div>
  
      <button
        onClick={clearAll}
        className="flex items-center gap-2 px-4 py-2.5 bg-red-500 text-white rounded-md 
          hover:bg-red-600 transition-colors font-medium sm:w-auto w-full"
      >
        <Trash2 className="w-5 h-5" />
        <span>Clear</span>
      </button>
    </div>
  </div>
  );
}