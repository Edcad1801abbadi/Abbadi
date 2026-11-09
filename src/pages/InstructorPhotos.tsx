import { useState, useRef, useEffect } from "react";
import { useInstructors } from "@/hooks/useInstructors";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { User, Upload, Check, ArrowLeft, Search, Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const ADMIN_FLAG = "instructor_photos_admin";

const InstructorPhotos = () => {
  const navigate = useNavigate();
  const [authorized, setAuthorized] = useState<boolean>(
    () => sessionStorage.getItem(ADMIN_FLAG) === "1",
  );
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState(false);

  const { data: instructors, refetch } = useInstructors();
  const [uploading, setUploading] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedEmpId, setSelectedEmpId] = useState<number | null>(null);
  const [adminPin, setAdminPin] = useState<string>("");

  useEffect(() => {
    const saved = sessionStorage.getItem(ADMIN_FLAG + "_pin");
    if (saved) setAdminPin(saved);
  }, []);

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Local gate; the server still verifies the PIN on every upload.
    if (pinInput.length >= 4) {
      sessionStorage.setItem(ADMIN_FLAG, "1");
      sessionStorage.setItem(ADMIN_FLAG + "_pin", pinInput);
      setAdminPin(pinInput);
      setAuthorized(true);
    } else {
      setPinError(true);
    }
  };

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
      const form = new FormData();
      form.append("file", file);
      form.append("employee_id", String(selectedEmpId));

      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/admin-upload-photo`,
        {
          method: "POST",
          headers: {
            apikey: publishableKey,
            authorization: `Bearer ${publishableKey}`,
            "x-admin-pin": adminPin,
          },
          body: form,
        },
      );

      if (res.status === 403) {
        sessionStorage.removeItem(ADMIN_FLAG);
        sessionStorage.removeItem(ADMIN_FLAG + "_pin");
        setAuthorized(false);
        throw new Error("الرقم السري غير صحيح");
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || "فشل الرفع");
      }

      toast.success("تم رفع الصورة بنجاح");
      refetch();
    } catch (err: any) {
      toast.error("فشل رفع الصورة: " + (err?.message ?? "Unknown error"));
    } finally {
      setUploading(null);
      setSelectedEmpId(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  if (!authorized) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-4" dir="rtl">
        <form onSubmit={handlePinSubmit} className="w-full max-w-sm space-y-4 p-6 rounded-xl border border-border bg-card">
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold">دخول المسؤول</h2>
          </div>
          <p className="text-sm text-muted-foreground">أدخل الرقم السري للمسؤول للوصول إلى إدارة صور المدربين.</p>
          <Input
            type="password"
            inputMode="numeric"
            autoFocus
            value={pinInput}
            onChange={(e) => { setPinInput(e.target.value); setPinError(false); }}
            placeholder="••••"
            className={pinError ? "border-destructive" : ""}
          />
          <div className="flex gap-2">
            <Button type="submit" className="flex-1">دخول</Button>
            <Button type="button" variant="ghost" onClick={() => navigate("/")}>إلغاء</Button>
          </div>
        </form>
      </div>
    );
  }

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
          accept="image/png,image/jpeg,image/webp,image/gif"
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
