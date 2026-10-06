"use client";

import * as React from "react";
import { Info } from "lucide-react";
import { adminApi, type PaymentConfig, type ShippingConfig, type StoreSettingsInput } from "@/lib/api";
import { useQuery } from "@/lib/use-query";
import { Button, Card, CardBody, CardHeader, Field, Input, PageHeader, Skeleton, Switch, Tabs, Textarea, useToast } from "@/components/ui";

type Tab = "store" | "payments" | "shipping";

export default function SettingsPage() {
  const [tab, setTab] = React.useState<Tab>("store");
  return (
    <>
      <PageHeader title="店鋪設定" description="店鋪資訊、金流與物流設定" />
      <Tabs<Tab>
        className="mb-6"
        value={tab}
        onChange={setTab}
        items={[
          { key: "store", label: "店鋪資訊" },
          { key: "payments", label: "金流設定" },
          { key: "shipping", label: "物流設定" },
        ]}
      />
      {tab === "store" && <StoreTab />}
      {tab === "payments" && <PaymentsTab />}
      {tab === "shipping" && <ShippingTab />}
    </>
  );
}

function StoreTab() {
  const toast = useToast();
  const { data, loading } = useQuery(() => adminApi.store(), []);
  const [f, setF] = React.useState<StoreSettingsInput | null>(null);
  const [saving, setSaving] = React.useState(false);
  React.useEffect(() => {
    if (data) {
      const s = data.store;
      setF({ name: s?.name ?? "", tagline: s?.tagline ?? "", logoUrl: s?.logoUrl ?? "", supportEmail: s?.supportEmail ?? "", supportPhone: s?.supportPhone ?? "", announcement: s?.announcement ?? "" });
    }
  }, [data]);
  if (loading || !f) return <Skeleton className="h-80 w-full max-w-2xl" />;

  async function save() {
    if (!f) return;
    setSaving(true);
    try {
      await adminApi.saveStore({ ...f, logoUrl: f.logoUrl || null, supportEmail: f.supportEmail || undefined, supportPhone: f.supportPhone || undefined });
      toast.success("店鋪資訊已儲存");
    } catch (e) {
      toast.error("儲存失敗", (e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader title="店鋪資訊" description="顯示於前台頁首、頁尾與出貨明細" />
      <CardBody className="space-y-4">
        <Field label="店鋪名稱" required>
          <Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        </Field>
        <Field label="標語">
          <Input value={f.tagline} onChange={(e) => setF({ ...f, tagline: e.target.value })} />
        </Field>
        <Field label="Logo 網址">
          <Input value={f.logoUrl ?? ""} onChange={(e) => setF({ ...f, logoUrl: e.target.value })} placeholder="https://…" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="客服 Email">
            <Input type="email" value={f.supportEmail ?? ""} onChange={(e) => setF({ ...f, supportEmail: e.target.value })} />
          </Field>
          <Field label="客服電話">
            <Input value={f.supportPhone ?? ""} onChange={(e) => setF({ ...f, supportPhone: e.target.value })} />
          </Field>
        </div>
        <Field label="全站公告" hint="顯示於前台頂部橫幅，留空則不顯示">
          <Textarea value={f.announcement} onChange={(e) => setF({ ...f, announcement: e.target.value })} rows={2} />
        </Field>
        <div className="flex justify-end">
          <Button onClick={save} loading={saving}>
            儲存
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}

function PaymentsTab() {
  const toast = useToast();
  const { data, loading, reload } = useQuery(() => adminApi.paymentConfigs(), []);
  if (loading || !data) return <Skeleton className="h-80 w-full" />;
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 rounded-md border border-primary-100 bg-primary-50 px-4 py-3 text-[13px] text-primary-700">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <p>綠界 ECPay 已預設測試環境 (Sandbox) 的特店憑證，可直接測試付款流程；正式上線時請替換為正式憑證並將「測試環境」設為 false。後台設定優先於環境變數。</p>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {data.configs.map((c) => (
          <PaymentCard key={c.provider} c={c} onSaved={reload} toast={toast} />
        ))}
      </div>
    </div>
  );
}

function PaymentCard({ c, onSaved, toast }: { c: PaymentConfig; onSaved: () => void; toast: ReturnType<typeof useToast> }) {
  const [enabled, setEnabled] = React.useState(c.enabled);
  const [fee, setFee] = React.useState(String(c.feePercent));
  const [cred, setCred] = React.useState<Record<string, string>>({ ...c.credentials });
  const [saving, setSaving] = React.useState(false);
  const dirty = enabled !== c.enabled || fee !== String(c.feePercent) || JSON.stringify(cred) !== JSON.stringify(c.credentials);

  async function save() {
    setSaving(true);
    try {
      await adminApi.savePaymentConfig(c.provider, { enabled, feePercent: Number(fee) || 0, credentials: cred, sortOrder: c.sortOrder });
      toast.success(`${c.meta.label} 設定已儲存`);
      onSaved();
    } catch (e) {
      toast.error("儲存失敗", (e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className={enabled ? "" : "opacity-80"}>
      <CardHeader title={c.meta.label} description={c.meta.description} action={<Switch checked={enabled} onChange={setEnabled} label={enabled ? "啟用" : "停用"} />} />
      <CardBody className="space-y-3">
        {c.meta.fields.map((fld) => (
          <Field key={fld.key} label={fld.label}>
            <Input
              type={fld.secret ? "password" : "text"}
              value={cred[fld.key] ?? ""}
              onChange={(e) => setCred({ ...cred, [fld.key]: e.target.value })}
              placeholder={fld.secret ? "••••••••" : ""}
              autoComplete="off"
              className="font-mono text-[13px]"
            />
          </Field>
        ))}
        <Field label="手續費 %" hint="僅供報表估算">
          <Input type="number" step="0.01" min={0} value={fee} onChange={(e) => setFee(e.target.value)} className="w-32" />
        </Field>
        <div className="flex justify-end">
          <Button size="sm" onClick={save} loading={saving} disabled={!dirty}>
            儲存
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}

function ShippingTab() {
  const toast = useToast();
  const { data, loading, reload } = useQuery(() => adminApi.shippingConfigs(), []);
  if (loading || !data) return <Skeleton className="h-80 w-full" />;
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {data.configs.map((c) => (
        <ShippingCard key={c.method} c={c} onSaved={reload} toast={toast} />
      ))}
    </div>
  );
}

function ShippingCard({ c, onSaved, toast }: { c: ShippingConfig; onSaved: () => void; toast: ReturnType<typeof useToast> }) {
  const [enabled, setEnabled] = React.useState(c.enabled);
  const [fee, setFee] = React.useState(String(c.fee));
  const [threshold, setThreshold] = React.useState(c.freeThreshold == null ? "" : String(c.freeThreshold));
  const [saving, setSaving] = React.useState(false);
  const dirty = enabled !== c.enabled || fee !== String(c.fee) || threshold !== (c.freeThreshold == null ? "" : String(c.freeThreshold));

  async function save() {
    setSaving(true);
    try {
      await adminApi.saveShippingConfig(c.method, { enabled, fee: Math.max(0, Number(fee) || 0), freeThreshold: threshold.trim() === "" ? null : Math.max(0, Number(threshold) || 0), credentials: c.credentials, sortOrder: c.sortOrder });
      toast.success(`${c.meta.label} 設定已儲存`);
      onSaved();
    } catch (e) {
      toast.error("儲存失敗", (e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className={enabled ? "" : "opacity-80"}>
      <CardHeader title={c.meta.label} description={`${c.meta.carrier} · ${c.meta.description}`} action={<Switch checked={enabled} onChange={setEnabled} label={enabled ? "啟用" : "停用"} />} />
      <CardBody className="space-y-3">
        <div className="grid grid-cols-2 gap-4">
          <Field label="運費 (NT$)">
            <Input type="number" min={0} value={fee} onChange={(e) => setFee(e.target.value)} />
          </Field>
          <Field label="免運門檻 (NT$)" hint="留空不免運">
            <Input type="number" min={0} value={threshold} onChange={(e) => setThreshold(e.target.value)} />
          </Field>
        </div>
        <p className="text-xs text-slate-400">預計送達：{c.meta.etaDays[0] === c.meta.etaDays[1] ? `${c.meta.etaDays[0]} 天` : `${c.meta.etaDays[0]}–${c.meta.etaDays[1]} 個工作天`}</p>
        <div className="flex justify-end">
          <Button size="sm" onClick={save} loading={saving} disabled={!dirty}>
            儲存
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}
