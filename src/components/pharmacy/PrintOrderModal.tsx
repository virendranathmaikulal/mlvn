import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

interface PrintOrderModalProps {
  open: boolean;
  onClose: () => void;
  onSelectSize: (size: "small" | "large") => void;
}

export function PrintOrderModal({ open, onClose, onSelectSize }: PrintOrderModalProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5" />
            Select Print Size
          </DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 pt-2">
          <button
            onClick={() => onSelectSize("small")}
            className="flex flex-col items-center gap-3 p-5 border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all group"
          >
            <div className="w-12 h-16 border-2 border-gray-400 group-hover:border-blue-500 rounded flex items-center justify-center bg-white shadow-sm">
              <div className="w-8 space-y-1">
                <div className="h-1 bg-gray-300 rounded" />
                <div className="h-1 bg-gray-300 rounded" />
                <div className="h-1 bg-gray-300 rounded w-3/4" />
              </div>
            </div>
            <div className="text-center">
              <p className="font-semibold text-sm">Small</p>
              <p className="text-xs text-muted-foreground">Thermal (58/80mm)</p>
            </div>
          </button>

          <button
            onClick={() => onSelectSize("large")}
            className="flex flex-col items-center gap-3 p-5 border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all group"
          >
            <div className="w-14 h-16 border-2 border-gray-400 group-hover:border-blue-500 rounded flex items-center justify-center bg-white shadow-sm">
              <div className="w-10 space-y-1">
                <div className="h-1 bg-gray-300 rounded" />
                <div className="h-1 bg-gray-300 rounded" />
                <div className="h-1 bg-gray-300 rounded" />
                <div className="h-1 bg-gray-300 rounded w-3/4" />
              </div>
            </div>
            <div className="text-center">
              <p className="font-semibold text-sm">Large</p>
              <p className="text-xs text-muted-foreground">Invoice (A4)</p>
            </div>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
