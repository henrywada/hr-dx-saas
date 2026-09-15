"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Camera, Check, RotateCcw, Save, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  applyTiltReading,
  captureFrameFromVideo,
  LANDSCAPE_LEFT_TILT_SCREEN_ANGLE,
  mountFromDeviceTilt,
  readScreenAngle,
  resolveHandheldMount,
  type MountOrientation,
} from "@/lib/capture/captureFrameFromVideo";
import { BUCKET, tmpObjectPath } from "@/lib/documents/storagePaths";
import {
  CARD_KEYS,
  type CardKey,
} from "@/features/documents/plugins/business_card/plugin";
import { analyzeDocument, createDocument } from "@/features/documents/actions";
import { APP_ROUTES } from "@/config/routes";
import { createClient } from "@/lib/supabase/client";

interface CaptureDocumentFormProps {
  tenantId: string;
  userId: string;
  defaultContextDate: string;
  documentType: "business_card";
}

type CaptureSide = "front" | "back";
type CameraState = "idle" | "starting" | "ready" | "denied" | "unsupported" | "error";
type FlowStatus = "idle" | "uploading" | "analyzing" | "saving" | "error";

type CapturedImage = {
  role: CaptureSide;
  blob: Blob;
  previewUrl: string;
};

type TmpImage = {
  role: CaptureSide;
  tmpPath: string;
};

type DuplicatePayload = {
  id: string;
  canMutate: boolean;
  extracted?: Record<string, string>;
  notes?: string;
  tags?: string[];
  contextDate?: string | null;
  companyVisible?: boolean;
  images: { role: string; url: string | null }[];
};

const FIELD_LABELS: Record<CardKey, string> = {
  full_name: "氏名",
  company: "会社名",
  title: "役職",
  department: "部署",
  address: "住所",
  phone: "電話",
  fax: "FAX",
  email: "メール",
  website: "Web",
};

const emptyExtracted = (): Record<CardKey, string> =>
  Object.fromEntries(CARD_KEYS.map((key) => [key, ""])) as Record<CardKey, string>;

function requestMotionPermission(): Promise<void> {
  try {
    const DOE = DeviceOrientationEvent as typeof DeviceOrientationEvent & {
      requestPermission?: () => Promise<string>;
    };
    if (typeof DOE.requestPermission === "function") {
      return DOE.requestPermission().then(() => undefined);
    }
  } catch {
    // Permission denied: shutter falls back to screen orientation.
  }
  return Promise.resolve();
}

function parseTags(input: string): string[] {
  return Array.from(
    new Set(
      input
        .split(/[,\n、]+/)
        .map((tag) => tag.trim())
        .filter(Boolean)
    )
  );
}

function roleLabel(role: CaptureSide | string): string {
  return role === "back" ? "裏面" : "表面";
}

async function blobFromCanvas(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("画像の生成に失敗しました。"));
      },
      "image/jpeg",
      0.92
    );
  });
}

export function CaptureDocumentForm({
  tenantId,
  userId,
  defaultContextDate,
  documentType,
}: CaptureDocumentFormProps) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const tmpImagesRef = useRef<TmpImage[]>([]);
  const capturedPreviewUrlsRef = useRef<string[]>([]);
  const tiltMountRef = useRef<MountOrientation | null>(null);
  const tiltListenFromRef = useRef(0);
  const landscapeStreakRef = useRef(0);
  const onDeviceOrientationRef = useRef((event: DeviceOrientationEvent) => {
    if (Date.now() < tiltListenFromRef.current) return;
    const reading = mountFromDeviceTilt(event.gamma, event.beta);
    const next = applyTiltReading(
      reading,
      landscapeStreakRef.current,
      tiltMountRef.current
    );
    landscapeStreakRef.current = next.landscapeStreak;
    tiltMountRef.current = next.tilt;
  });

  const [cameraState, setCameraState] = useState<CameraState>("idle");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [flowStatus, setFlowStatus] = useState<FlowStatus>("idle");
  const [flowError, setFlowError] = useState<string | null>(null);
  const [captureRole, setCaptureRole] = useState<CaptureSide>("front");
  const [frontImage, setFrontImage] = useState<CapturedImage | null>(null);
  const [backImage, setBackImage] = useState<CapturedImage | null>(null);
  const [tmpImages, setTmpImages] = useState<TmpImage[]>([]);
  const [confirming, setConfirming] = useState(false);
  const [extracted, setExtracted] = useState<Record<CardKey, string>>(emptyExtracted);
  const [notes, setNotes] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [contextDate, setContextDate] = useState(defaultContextDate);
  const [companyVisible, setCompanyVisible] = useState(false);
  const [rawOcr, setRawOcr] = useState("");
  const [ocrWarning, setOcrWarning] = useState(false);
  const [duplicate, setDuplicate] = useState<DuplicatePayload | null>(null);
  const [activePhoto, setActivePhoto] = useState<CaptureSide>("front");

  const readOnly = duplicate?.canMutate === false;
  const capturedImages = [frontImage, backImage].filter(Boolean) as CapturedImage[];
  const tagChips = parseTags(tagsInput);
  const canAnalyze =
    Boolean(frontImage) &&
    flowStatus !== "uploading" &&
    flowStatus !== "analyzing";
  const canSave = confirming && !readOnly && flowStatus !== "saving" && tmpImages.length > 0;

  const stopCamera = useCallback(() => {
    if (typeof window !== "undefined") {
      window.removeEventListener("deviceorientation", onDeviceOrientationRef.current);
    }
    tiltMountRef.current = null;
    landscapeStreakRef.current = 0;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const removeTmpObjects = useCallback(
    async (images: TmpImage[]) => {
      const paths = images.map((image) => image.tmpPath);
      if (paths.length === 0) return;
      const { error } = await supabase.storage.from(BUCKET).remove(paths);
      if (error) {
        console.error("captured document tmp remove failed", error);
      }
    },
    [supabase]
  );

  const clearTmpImages = useCallback(async () => {
    const current = tmpImagesRef.current;
    tmpImagesRef.current = [];
    setTmpImages([]);
    await removeTmpObjects(current);
  }, [removeTmpObjects]);

  useEffect(() => {
    tmpImagesRef.current = tmpImages;
  }, [tmpImages]);

  useEffect(() => {
    capturedPreviewUrlsRef.current = [frontImage?.previewUrl, backImage?.previewUrl].filter(
      Boolean
    ) as string[];
  }, [frontImage, backImage]);

  useEffect(() => {
    return () => {
      stopCamera();
      for (const url of capturedPreviewUrlsRef.current) {
        URL.revokeObjectURL(url);
      }
      void removeTmpObjects(tmpImagesRef.current);
    };
  }, [removeTmpObjects, stopCamera]);

  const startCamera = useCallback(async () => {
    setCameraState("starting");
    setCameraError(null);
    setFlowError(null);
    stopCamera();

    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setCameraState("unsupported");
      setCameraError(
        "このブラウザではカメラAPIを利用できません。HTTPSで開いているか確認してください。"
      );
      return;
    }

    try {
      await requestMotionPermission();
      tiltMountRef.current = null;
      landscapeStreakRef.current = 0;
      tiltListenFromRef.current = Date.now() + 300;
      if (typeof window !== "undefined") {
        window.addEventListener("deviceorientation", onDeviceOrientationRef.current);
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });

      streamRef.current = stream;
      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        await video.play();
      }
      setCameraState("ready");
    } catch (err) {
      stopCamera();
      console.error("getUserMedia failed", err);
      const name = err instanceof DOMException ? err.name : "";
      if (name === "NotAllowedError" || name === "PermissionDeniedError") {
        setCameraState("denied");
        setCameraError("カメラの使用が拒否されました。ブラウザの設定で許可してください。");
      } else if (name === "NotFoundError" || name === "DevicesNotFoundError") {
        setCameraState("error");
        setCameraError("利用可能なカメラが見つかりませんでした。");
      } else {
        setCameraState("error");
        setCameraError(err instanceof Error ? err.message : "カメラの起動に失敗しました");
      }
    }
  }, [stopCamera]);

  const setCapturedImage = useCallback(
    (role: CaptureSide, image: CapturedImage) => {
      if (role === "front") {
        if (frontImage) URL.revokeObjectURL(frontImage.previewUrl);
        setFrontImage(image);
        setActivePhoto("front");
      } else {
        if (backImage) URL.revokeObjectURL(backImage.previewUrl);
        setBackImage(image);
        setActivePhoto("back");
      }
    },
    [backImage, frontImage]
  );

  async function handleShutter() {
    const video = videoRef.current;
    if (!video || cameraState !== "ready") return;

    if (!video.videoWidth || !video.videoHeight) {
      setFlowError("映像の準備ができていません。少し待ってから再度お試しください。");
      return;
    }

    try {
      const rawAngle = readScreenAngle();
      const mount = resolveHandheldMount({
        screenAngle: rawAngle,
        viewportIsLandscape:
          typeof window !== "undefined" && window.innerWidth > window.innerHeight,
        screenOrientationType:
          typeof screen !== "undefined" ? screen.orientation?.type ?? "" : "",
        deviceTiltMount: tiltMountRef.current,
      });
      const screenAngle =
        mount === "landscape" ? LANDSCAPE_LEFT_TILT_SCREEN_ANGLE : rawAngle;
      const canvas = captureFrameFromVideo(video, mount, false, screenAngle);
      const blob = await blobFromCanvas(canvas);
      setCapturedImage(captureRole, {
        role: captureRole,
        blob,
        previewUrl: URL.createObjectURL(blob),
      });
      stopCamera();
      setCameraState("idle");
      if (captureRole === "front") setCaptureRole("back");
    } catch (err) {
      setFlowError(err instanceof Error ? err.message : "画像の生成に失敗しました。");
    }
  }

  async function uploadTmpImages(): Promise<TmpImage[]> {
    if (!frontImage) throw new Error("表面を撮影してください。");
    const images = [frontImage, backImage].filter(Boolean) as CapturedImage[];
    const uploaded: TmpImage[] = [];

    try {
      for (const image of images) {
        const path = tmpObjectPath(tenantId, userId, crypto.randomUUID());
        const { error } = await supabase.storage
          .from(BUCKET)
          .upload(path, image.blob, { contentType: "image/jpeg" });
        if (error) throw error;
        uploaded.push({
          role: image.role,
          tmpPath: path,
        });
      }
      return uploaded;
    } catch (err) {
      await removeTmpObjects(uploaded);
      throw err;
    }
  }

  async function handleAnalyze() {
    setFlowError(null);
    setOcrWarning(false);
    setDuplicate(null);
    setRawOcr("");
    await clearTmpImages();

    try {
      setFlowStatus("uploading");
      const uploaded = await uploadTmpImages();
      tmpImagesRef.current = uploaded;
      setTmpImages(uploaded);

      setFlowStatus("analyzing");
      const result = await analyzeDocument({
          documentType,
          images: uploaded.map((image) => ({
            role: image.role,
            path: image.tmpPath,
          })),
        });
      if (!result.success) {
        throw new Error("error" in result ? result.error : "解析に失敗しました。")
      }

      const nextExtracted = emptyExtracted();
      for (const key of CARD_KEYS) {
        nextExtracted[key] = result.extracted?.[key] ?? "";
      }
      const duplicateSeed = result.duplicate?.canMutate ? result.duplicate : null;
      if (duplicateSeed?.extracted) {
        for (const key of CARD_KEYS) {
          nextExtracted[key] = duplicateSeed.extracted[key] ?? "";
        }
      }
      setExtracted(nextExtracted);
      setNotes(duplicateSeed?.notes ?? "");
      setTagsInput(duplicateSeed?.tags?.join(", ") ?? "");
      setContextDate(duplicateSeed ? duplicateSeed.contextDate ?? "" : defaultContextDate);
      setCompanyVisible(duplicateSeed?.companyVisible ?? false);
      setRawOcr(result.rawOcr ?? "");
      setOcrWarning(result.warning === "ocr_failed");
      setDuplicate(result.duplicate ?? null);
      setConfirming(true);
      setActivePhoto("front");
      setFlowStatus("idle");
    } catch (err) {
      console.error("document analyze failed", err);
      await clearTmpImages();
      setFlowStatus("error");
      setFlowError(err instanceof Error ? err.message : "解析に失敗しました。");
    }
  }

  async function handleBackToCapture() {
    await clearTmpImages();
    setConfirming(false);
    setFlowStatus("idle");
    setFlowError(null);
    setOcrWarning(false);
    setDuplicate(null);
    setRawOcr("");
  }

  async function handleSave() {
    if (!canSave) return;
    setFlowStatus("saving");
    setFlowError(null);

    try {
      const result = await createDocument({
          documentType,
          existingId: duplicate?.canMutate ? duplicate.id : null,
          companyVisible,
          notes,
          tags: tagChips,
          contextDate: contextDate || null,
          extracted,
          rawOcr,
          images: tmpImages.map((image) => ({
            role: image.role,
            tmpPath: image.tmpPath,
          })),
        });
      if (!result.success) {
        throw new Error("error" in result ? result.error : "保存に失敗しました。")
      }

      tmpImagesRef.current = [];
      setTmpImages([]);
      router.push(`${APP_ROUTES.TENANT.TOOL_DOCUMENTS}?type=business_card`);
    } catch (err) {
      console.error("document save failed", err);
      setFlowStatus("error");
      setFlowError(err instanceof Error ? err.message : "保存に失敗しました。");
    }
  }

  function resetCaptured(role: CaptureSide) {
    const image = role === "front" ? frontImage : backImage;
    if (image) URL.revokeObjectURL(image.previewUrl);
    if (role === "front") {
      if (backImage) URL.revokeObjectURL(backImage.previewUrl);
      setFrontImage(null);
      setBackImage(null);
      setCaptureRole("front");
      setActivePhoto("front");
    } else {
      setBackImage(null);
      setCaptureRole("back");
      setActivePhoto("front");
    }
    setConfirming(false);
    setFlowError(null);
    setRawOcr("");
  }

  const activeCapturedPhoto =
    activePhoto === "back" ? backImage ?? frontImage : frontImage ?? backImage;
  const busy =
    flowStatus === "uploading" ||
    flowStatus === "analyzing" ||
    flowStatus === "saving";
  const showLiveCamera = cameraState === "starting" || cameraState === "ready";
  const currentPreviewImage = captureRole === "front" ? frontImage : backImage;

  if (confirming) {
    return (
      <div className="mx-auto flex max-w-md flex-col gap-5 bg-white p-6 pb-12 text-gray-900">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-primary">名刺キャプチャ</p>
            <h1 className="text-lg font-semibold text-gray-900">確認して保存</h1>
          </div>
          <button
            type="button"
            onClick={() => void handleBackToCapture()}
            disabled={busy}
            className="text-sm font-medium text-primary transition-colors hover:text-gray-900 disabled:opacity-50"
          >
            ←戻る
          </button>
        </div>

        {ocrWarning && (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
            OCRに失敗しました。画像は保持しているため、項目を手入力して保存できます。
          </div>
        )}

        {duplicate && (
          <div className="rounded-md border border-gray-200 bg-white p-3 text-sm">
            <p className="font-medium text-gray-900">
              {duplicate.canMutate
                ? "重複候補が見つかりました。保存すると既存データを更新します。"
                : "編集権限のない重複データが見つかりました。"}
            </p>
            {!duplicate.canMutate && (
              <Link
                href={`${APP_ROUTES.TENANT.TOOL_DOCUMENTS}?type=business_card&open=${duplicate.id}`}
                className="mt-2 inline-flex font-medium text-primary transition-colors hover:text-gray-900"
              >
                ホルダーで開く
              </Link>
            )}
          </div>
        )}

        <section className="space-y-3">
          <div className="flex gap-2">
            {capturedImages.map((image) => (
              <button
                key={image.role}
                type="button"
                onClick={() => setActivePhoto(image.role)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                  activePhoto === image.role
                    ? "border-primary bg-primary text-white"
                    : "border-gray-200 bg-white text-gray-900 hover:border-primary/50"
                }`}
              >
                今回の{roleLabel(image.role)}
              </button>
            ))}
          </div>
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-black">
            <div className="aspect-3/4 w-full bg-black">
              {activeCapturedPhoto && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={activeCapturedPhoto.previewUrl}
                  alt={`${roleLabel(activeCapturedPhoto.role)}プレビュー`}
                  className="h-full w-full object-contain"
                />
              )}
            </div>
          </div>
        </section>

        {duplicate?.images?.some((image) => image.url) && (
          <section className="space-y-2 rounded-lg border border-gray-200 bg-white p-3">
            <h2 className="text-sm font-bold text-gray-900">既存の写真</h2>
            <div className="grid grid-cols-2 gap-2">
              {duplicate.images.map((image, index) =>
                image.url ? (
                  <div
                    key={`${image.role}-${index}`}
                    className="overflow-hidden rounded-md border border-gray-200 bg-black"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={image.url}
                      alt={`既存の${roleLabel(image.role)}`}
                      className="aspect-3/4 h-full w-full object-contain"
                    />
                  </div>
                ) : null
              )}
            </div>
          </section>
        )}

        <section className="space-y-3 rounded-lg border border-gray-200 bg-white p-4">
          <h2 className="text-sm font-bold text-gray-900">OCR項目</h2>
          {CARD_KEYS.map((key) => (
            <label key={key} className="block space-y-1.5">
              <span className="text-xs font-medium text-gray-500">
                {FIELD_LABELS[key]}
              </span>
              <input
                type={key === "email" ? "email" : "text"}
                value={extracted[key]}
                onChange={(event) =>
                  setExtracted((current) => ({
                    ...current,
                    [key]: event.target.value,
                  }))
                }
                disabled={readOnly || busy}
                className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-60"
              />
            </label>
          ))}
        </section>

        <section className="space-y-3 rounded-lg border border-gray-200 bg-white p-4">
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-gray-900">メモ</span>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={3}
              disabled={readOnly || busy}
              className="w-full resize-y rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-60"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-gray-900">タグ</span>
            <input
              type="text"
              value={tagsInput}
              onChange={(event) => setTagsInput(event.target.value)}
              placeholder="例: 展示会, 営業"
              disabled={readOnly || busy}
              className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-60"
            />
          </label>
          {tagChips.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {tagChips.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-gray-200 bg-white px-2 py-1 text-xs text-gray-900"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-gray-900">会った日</span>
            <input
              type="date"
              value={contextDate}
              onChange={(event) => setContextDate(event.target.value)}
              disabled={readOnly || busy}
              className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-60"
            />
          </label>

          <label className="inline-flex items-center gap-2 text-sm text-gray-900">
            <input
              type="checkbox"
              checked={companyVisible}
              onChange={(event) => setCompanyVisible(event.target.checked)}
              disabled={readOnly || busy}
              className="accent-primary disabled:opacity-60"
            />
            会社に公開する
          </label>
        </section>

        {flowError && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
            {flowError}
          </p>
        )}

        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={!canSave}
          className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-3 text-sm font-medium text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Save className="h-4 w-4" strokeWidth={1.75} />
          {flowStatus === "saving"
            ? "保存中..."
            : duplicate?.canMutate
              ? "更新する"
              : "保存する"}
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-5 bg-white p-6 pb-12 text-gray-900">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-primary">文書ホルダー</p>
          <h1 className="text-lg font-semibold text-gray-900">名刺を撮る</h1>
        </div>
        <div className="flex shrink-0 items-center gap-3 text-sm">
          <Link
            href={`${APP_ROUTES.TENANT.TOOL_DOCUMENTS}?type=business_card`}
            className="font-medium text-primary transition-colors hover:text-gray-900"
          >
            ホルダー
          </Link>
          <Link href={APP_ROUTES.TENANT.PORTAL} className="font-medium text-primary transition-colors hover:text-gray-900">
            ←戻る
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="rounded-md border border-primary bg-primary px-2 py-2 text-center font-medium text-white">
          1. 表
        </div>
        <div
          className={`rounded-md border px-2 py-2 text-center font-medium ${
            frontImage
              ? "border-primary bg-primary text-white"
              : "border-gray-200 bg-white text-gray-500"
          }`}
        >
          2. 裏
        </div>
        <div className="rounded-md border border-gray-200 bg-white px-2 py-2 text-center font-medium text-gray-500">
          3. 確認
        </div>
      </div>

      <section className="space-y-3 rounded-lg border border-gray-200 bg-white p-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-gray-900">
              {roleLabel(captureRole)}を撮影
            </h2>
            <p className="mt-1 text-xs text-gray-500">
              表面は必須、裏面は任意です。
            </p>
          </div>
          {frontImage && captureRole === "back" && (
            <button
              type="button"
              onClick={() => setCaptureRole("front")}
              className="text-xs font-medium text-primary hover:text-gray-900"
            >
              表を撮り直す
            </button>
          )}
        </div>

        {(showLiveCamera || currentPreviewImage) && (
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-black">
            <div className="relative aspect-3/4 w-full bg-black">
              {showLiveCamera && (
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  autoPlay
                  className={`h-full w-full object-cover ${
                    cameraState === "ready" ? "opacity-100" : "opacity-0"
                  }`}
                />
              )}
              {!showLiveCamera && currentPreviewImage && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={currentPreviewImage.previewUrl}
                  alt={`${roleLabel(captureRole)}プレビュー`}
                  className="h-full w-full object-contain"
                />
              )}
              {showLiveCamera && cameraState === "starting" && (
                <div className="absolute inset-0 flex items-center justify-center px-4 text-center">
                  <p className="text-sm text-white/90">カメラを起動しています...</p>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <button
            type="button"
            onClick={() => void startCamera()}
            disabled={cameraState === "starting" || busy}
            className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-gray-200 bg-white px-4 py-3 text-sm font-medium text-gray-900 transition hover:border-primary/50 disabled:opacity-50"
          >
            <Camera className="h-4 w-4 text-primary" strokeWidth={1.75} />
            {cameraState === "starting" ? "カメラ起動中..." : `${roleLabel(captureRole)}を撮る`}
          </button>

          {cameraState === "ready" && (
            <button
              type="button"
              onClick={() => void handleShutter()}
              className="w-full rounded-md bg-gray-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-gray-900/90"
            >
              シャッター
            </button>
          )}

          {(cameraState === "denied" ||
            cameraState === "unsupported" ||
            cameraState === "error") &&
            cameraError && (
              <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
                {cameraError}
              </p>
            )}

          {(captureRole === "front" ? frontImage : backImage) && (
            <button
              type="button"
              onClick={() => resetCaptured(captureRole)}
              disabled={busy}
              className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-gray-200 bg-white px-4 py-2 text-sm text-gray-900 transition hover:border-primary/50 disabled:opacity-50"
            >
              <RotateCcw className="h-4 w-4" strokeWidth={1.75} />
              撮り直す
            </button>
          )}
        </div>
      </section>

      {frontImage && (
        <section className="space-y-3 rounded-lg border border-gray-200 bg-white p-4">
          <h2 className="text-sm font-bold text-gray-900">撮影済み</h2>
          <div className="grid grid-cols-2 gap-3">
            {[frontImage, backImage].filter(Boolean).map((image) => (
              <button
                key={image!.role}
                type="button"
                onClick={() => {
                  setCaptureRole(image!.role);
                  setActivePhoto(image!.role);
                }}
                className="overflow-hidden rounded-md border border-gray-200 bg-black text-left"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={image!.previewUrl}
                  alt={`${roleLabel(image!.role)}プレビュー`}
                  className="aspect-3/4 w-full object-contain"
                />
                <span className="block bg-white px-2 py-1 text-xs font-medium text-gray-900">
                  {roleLabel(image!.role)}
                </span>
              </button>
            ))}
          </div>
          {captureRole === "back" && !backImage && (
            <p className="text-xs text-gray-500">
              裏面が不要な場合は、このまま解析に進めます。
            </p>
          )}
        </section>
      )}

      {flowError && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
          {flowError}
        </p>
      )}

      <button
        type="button"
        onClick={() => void handleAnalyze()}
        disabled={!canAnalyze}
        className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-3 text-sm font-medium text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {flowStatus === "uploading" || flowStatus === "analyzing" ? (
          <Search className="h-4 w-4" strokeWidth={1.75} />
        ) : (
          <Check className="h-4 w-4" strokeWidth={1.75} />
        )}
        {flowStatus === "uploading"
          ? "アップロード中..."
          : flowStatus === "analyzing"
            ? "解析中..."
            : backImage
              ? "解析して確認へ"
              : "裏面をスキップして確認へ"}
      </button>
    </div>
  );
}
