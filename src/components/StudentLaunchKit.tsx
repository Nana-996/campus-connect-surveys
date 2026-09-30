import { useState } from "react";
import QRCode from "qrcode";
import { toast } from "sonner";
import { Copy, Download, Mail, MessageCircle, QrCode, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { siteUrl } from "@/lib/site";

type Props = { school: { name: string; domain: string; joinSlug: string } };

const announcementFor = (name: string, url: string) =>
  `${name} is now officially partnered with CampusVerify.\n\nStudents can join with their ${name} academic email, receive 50 permanent welcome credits, answer verified surveys and run their own research.\n\nCreate your student account: ${url}`;

async function copy(text: string, success: string) {
  await navigator.clipboard.writeText(text);
  toast.success(success);
}

export function StudentLaunchKit({ school }: Props) {
  const joinUrl = siteUrl(`/join/${school.joinSlug}`);
  const announcement = announcementFor(school.name, joinUrl);
  const [downloading, setDownloading] = useState(false);

  const downloadPoster = async () => {
    setDownloading(true);
    try {
      const qr = await QRCode.toDataURL(joinUrl, { width: 700, margin: 2, errorCorrectionLevel: "H" });
      const canvas = document.createElement("canvas");
      canvas.width = 1600;
      canvas.height = 2000;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Poster unavailable");
      ctx.fillStyle = "#f7f2df";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#1f4d33";
      ctx.fillRect(0, 0, canvas.width, 310);
      ctx.fillStyle = "#f7f2df";
      ctx.textAlign = "center";
      ctx.font = "700 58px Georgia, serif";
      ctx.fillText("CampusVerify", 800, 135);
      ctx.font = "500 32px Arial, sans-serif";
      ctx.fillText(`in partnership with ${school.name}`, 800, 215);
      ctx.fillStyle = "#183728";
      ctx.font = "700 92px Georgia, serif";
      ctx.fillText("Students, your campus", 800, 455);
      ctx.fillText("research network is here.", 800, 565);
      ctx.font = "500 36px Arial, sans-serif";
      ctx.fillText("Scan to create your verified student account", 800, 675);
      ctx.fillText("and receive 50 permanent welcome credits.", 800, 725);
      const image = new Image();
      image.src = qr;
      await image.decode();
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(390, 790, 820, 820);
      ctx.drawImage(image, 450, 850, 700, 700);
      ctx.fillStyle = "#183728";
      ctx.font = "700 34px Arial, sans-serif";
      ctx.fillText(joinUrl.replace("https://", ""), 800, 1695);
      ctx.font = "500 28px Arial, sans-serif";
      ctx.fillText(`Use your @${school.domain} academic email`, 800, 1760);
      ctx.font = "500 24px Arial, sans-serif";
      ctx.fillText("Verified people. Better research.", 800, 1870);

      const link = document.createElement("a");
      link.download = `${school.joinSlug}-campusverify-launch.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      toast.success("Launch poster downloaded");
    } catch {
      toast.error("Could not create the poster. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <section className="space-y-5">
      <div className="border-b border-foreground/15 pb-5">
        <div className="flex items-center gap-2 text-primary"><QrCode className="h-5 w-5" /><span className="text-xs font-bold uppercase tracking-wider">Student launch kit</span></div>
        <h2 className="mt-2 font-serif text-4xl">Invite your students professionally.</h2>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">This permanent partnership link recognizes {school.name} and accepts verified students using the school's academic email.</p>
      </div>

      <div>
        <label htmlFor="school-join-link" className="text-xs font-semibold uppercase tracking-wider">Official student joining link</label>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <Input id="school-join-link" readOnly value={joinUrl} className="h-11 min-w-0 font-mono text-xs" />
          <Button type="button" className="h-11 shrink-0" onClick={() => void copy(joinUrl, "Joining link copied")}><Copy /> Copy link</Button>
        </div>
      </div>

      <div className="border-y border-foreground/15 py-5">
        <p className="text-xs font-semibold uppercase tracking-wider">Ready-to-send announcement</p>
        <div className="mt-2 whitespace-pre-wrap bg-secondary/60 p-4 text-sm leading-relaxed">{announcement}</div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => void copy(announcement, "Announcement copied")}><Copy /> Copy message</Button>
          <Button asChild variant="outline"><a href={`https://wa.me/?text=${encodeURIComponent(announcement)}`} target="_blank" rel="noreferrer"><MessageCircle /> WhatsApp</a></Button>
          <Button asChild variant="outline"><a href={`mailto:?subject=${encodeURIComponent(`${school.name} × CampusVerify`)}&body=${encodeURIComponent(announcement)}`}><Mail /> Email</a></Button>
          {typeof navigator !== "undefined" && typeof navigator.share === "function" && (
            <Button type="button" variant="outline" onClick={() => void navigator.share({ title: `${school.name} × CampusVerify`, text: announcement, url: joinUrl }).catch(() => {})}><Share2 /> Share</Button>
          )}
        </div>
      </div>

      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div><p className="font-semibold">Printable QR poster</p><p className="text-sm text-muted-foreground">Download a high-resolution notice for department boards, orientations and student groups.</p></div>
        <Button type="button" onClick={() => void downloadPoster()} disabled={downloading} className="shrink-0"><Download /> {downloading ? "Preparing…" : "Download poster"}</Button>
      </div>

      <ol className="grid gap-3 border-t border-foreground/15 pt-5 sm:grid-cols-3">
        {["Share the link through official student channels.", "Ask students to use their academic email.", "Track new students and activity in this portal."].map((step, index) => (
          <li key={step} className="flex gap-3 text-sm"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">{index + 1}</span><span>{step}</span></li>
        ))}
      </ol>
    </section>
  );
}