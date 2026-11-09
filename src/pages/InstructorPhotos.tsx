import { useState, useRef } from "react";
import { useInstructors } from "@/hooks/useInstructors";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { User, Upload, Check, ArrowLeft, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const InstructorPhotos = () => {
  const { data: instructors, refetch } = useInstructors();
  const [uploading, setUploading] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedEmpId, setSelectedEmpId] = useState<number | null>(null);
  const navigate = useNavigate();

  const filtered = instructors?.filter(i =>
    i.name.toLowerCase().includes(search.toLowerCase()) ||
    i.employee_id.toString().includes(search)
  ) ?? [];

  const handleUploadClick = (empId: number) => {
    setSelectedEmpId(empId);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || selectedEmpId === null) return;

    setUploading(selectedEmpId);
    try {
      const ext = file.name.split(".").pop();
      const path = `${selectedEmpId}.${ext}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("instructor-photos")
        .upload(path, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("instructor-photos")
        .getPublicUrl(path);

      // Update instructor record
      const { error: updateError } = await supabase
        .from("instructors")
        .update({ photo_url: urlData.publicUrl })
        .eq("employee_id", selectedEmpId);

      if (updateError) throw updateError;

      toast.success("تم رفع الصورة بنجاح");
      refetch();
    } catch (err: any) {
      toast.error("فشل رفع الصورة: " + err.message);
    } finally {
      setUploading(null);
      setSelectedEmpId(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-4" dir="rtl">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold">إدارة صور المدربين</h1>
        </div>

        <div className="relative mb-4">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="ابحث بالاسم أو رقم الموظف..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pr-10"
          />
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />

        <div className="space-y-2">
          {filtered.map(inst => (
            <div
              key={inst.employee_id}
              className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card"
            >
              <Avatar className="w-12 h-12">
                {inst.photo_url ? (
                  <AvatarImage src={inst.photo_url} alt={inst.name} />
                ) : null}
                <AvatarFallback>
                  <User className="w-5 h-5" />
                </AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{inst.name}</p>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">#{inst.employee_id}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${inst.position === 'Trainer' ? 'bg-secondary text-muted-foreground' : 'bg-primary/20 text-primary font-bold'}`}>{inst.position}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {inst.photo_url && (
                  <Check className="w-4 h-4 text-emerald-500" />
                )}
                <Button
                  size="sm"
                  variant={inst.photo_url ? "outline" : "default"}
                  onClick={() => handleUploadClick(inst.employee_id)}
                  disabled={uploading === inst.employee_id}
                >
                  <Upload className="w-4 h-4 ml-1" />
                  {uploading === inst.employee_id ? "جاري الرفع..." : inst.photo_url ? "تغيير" : "رفع صورة"}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default InstructorPhotos;
