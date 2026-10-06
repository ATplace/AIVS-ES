"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { Printer, Truck, BadgeCheck, MessageSquarePlus, ImageOff } from "lucide-react";
import { formatMoney, ORDER_STATUS_LABEL, ORDER_TRANSITIONS, SHIPPING_METHOD_META, type OrderDTO, type OrderStatus, type ShippingMethod } from "@es/shared";
import { adminApi, type OrderEvent } from "@/lib/api";
import { useQuery } from "@/lib/use-query";
import { formatDate } from "@/lib/utils";
import { Button, Card, CardBody, CardHeader, Dialog, Field, Input, PageHeader, Select, Skeleton, Table, TBody, TD, TH, THead, TR, Textarea, useToast } from "@/components/ui";
import { OrderStatusBadge, PaymentStatusBadge, ShipmentStatusBadge, SHIPMENT_STATUS_OPTIONS, paymentProviderLabel, shippingMethodLabel } from "@/components/status-badge";

const eventTone: Record<string, string> = { created: "bg-slate-400", status: "bg-indigo-500", payment: "bg-emerald-500", shipment: "bg-violet-500", note: "bg-amber-500" };

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);
  const toast = useToast();
  const { data, loading, error, reload } = useQuery(() => adminApi.order(id), [id]);
  const [statusDlg, setStatusDlg] = React.useState<OrderStatus | null>(null);
  const [statusNote, setStatusNote] = React.useState("");
  const [shipDlg, setShipDlg] = React.useState(false);
  const [ship, setShip] = React.useState({ trackingNo: "", packageCount: "1", note: "" });
  const [trackDlg, setTrackDlg] = React.useState(false);
  const [track, setTrack] = React.useState({ trackingNo: "", status: "" });
  const [noteDlg, setNoteDlg] = React.useState(false);
  const [note, setNote] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  if (error) return <div className="rounded-md bg-danger-50 p-4 text-sm text-danger-700">{error}</div>;
  if (loading || !data) return <Skeleton className="h-96 w-full" />;
  const { order, events } = data;
  const nextStatuses = ORDER_TRANSITIONS[order.status] ?? [];
  const canShip = ["paid", "processing"].includes(order.status) && !order.shipment;
  const addr = order.shippingAddress;
  const meta = SHIPPING_METHOD_META[order.shippingMethod as ShippingMethod];

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    setBusy(true);
    try {
      await fn();
      toast.success(ok);
      reload();
      return true;
    } catch (e) {
      toast.error("操作失敗", (e as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader
        breadcrumb={
          <Link href="/orders" className="hover:underline">
            訂單管理
          </Link>
        }
        title={
          <span className="inline-flex flex-wrap items-center gap-3">
            <span className="font-mono">{order.orderNo}</span>
            <OrderStatusBadge status={order.status} />
            <PaymentStatusBadge status={order.paymentStatus} />
          </span>
        }
        description={`建立於 ${formatDate(order.createdAt)} · 最後更新 ${formatDate(order.updatedAt)}`}
        actions={
          <>
            {order.paymentStatus === "pending" && !["cancelled", "refunded"].includes(order.status) && (
              <Button variant="outline" onClick={() => run(() => adminApi.markPaid(order.id), "已標記為已收款")} loading={busy}>
                <BadgeCheck className="h-4 w-4" /> 標記已收款
              </Button>
            )}
            {canShip && (
              <Button onClick={() => setShipDlg(true)}>
                <Truck className="h-4 w-4" /> 建立出貨單
              </Button>
            )}
            {order.shipment && (
              <Button
                variant="outline"
                onClick={() => {
                  setTrack({ trackingNo: order.shipment?.trackingNo ?? "", status: order.shipment?.status ?? "shipped" });
                  setTrackDlg(true);
                }}
              >
                更新物流
              </Button>
            )}
            <Link href={`/orders/manifest?ids=${order.id}`} target="_blank">
              <Button variant="outline">
                <Printer className="h-4 w-4" /> 出貨明細
              </Button>
            </Link>
          </>
        }
      />

      {nextStatuses.length > 0 && (
        <div className="mb-6 flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3">
          <span className="text-[13px] text-slate-500">更新狀態為：</span>
          {nextStatuses.map((s) => (
            <Button key={s} size="sm" variant={s === "cancelled" || s === "refunded" ? "danger" : "outline"} onClick={() => (setStatusNote(""), setStatusDlg(s))}>
              {ORDER_STATUS_LABEL[s]}
            </Button>
          ))}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <Card>
            <CardHeader title="商品明細" description={`${order.items.reduce((s, i) => s + i.quantity, 0)} 件商品`} />
            <Table>
              <THead>
                <tr>
                  <TH>商品</TH>
                  <TH>SKU</TH>
                  <TH align="right">單價</TH>
                  <TH align="right">數量</TH>
                  <TH align="right">小計</TH>
                </tr>
              </THead>
              <TBody>
                {order.items.map((it) => (
                  <TR key={it.id}>
                    <TD>
                      <div className="flex items-center gap-3">
                        <Thumb src={it.image} />
                        <div>
                          <Link href={`/products/${it.productId}`} className="font-medium text-slate-800 hover:underline">
                            {it.productName}
                          </Link>
                          <p className="text-xs text-slate-500">{it.variantName}</p>
                        </div>
                      </div>
                    </TD>
                    <TD className="font-mono text-xs text-slate-500">{it.sku}</TD>
                    <TD align="right">{formatMoney(it.unitPrice)}</TD>
                    <TD align="right">{it.quantity}</TD>
                    <TD align="right" className="font-medium">
                      {formatMoney(it.lineTotal)}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
            <CardBody className="border-t border-slate-100">
              <dl className="ml-auto grid max-w-xs grid-cols-2 gap-y-1.5 text-[13px]">
                <dt className="text-slate-500">商品小計</dt>
                <dd className="text-right tabular-nums">{formatMoney(order.subtotal)}</dd>
                <dt className="text-slate-500">折扣{order.couponCode && <span className="ml-1 rounded bg-slate-100 px-1 font-mono text-[11px]">{order.couponCode}</span>}</dt>
                <dd className="text-right tabular-nums text-emerald-700">{order.discount ? `- ${formatMoney(order.discount)}` : "—"}</dd>
                <dt className="text-slate-500">運費</dt>
                <dd className="text-right tabular-nums">{order.shippingFee ? formatMoney(order.shippingFee) : "免運"}</dd>
                <dt className="border-t border-slate-200 pt-2 font-medium text-slate-900">總計</dt>
                <dd className="border-t border-slate-200 pt-2 text-right text-base font-semibold tabular-nums text-slate-900">{formatMoney(order.total)}</dd>
              </dl>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="事件時間軸"
              action={
                <Button size="sm" variant="outline" onClick={() => (setNote(""), setNoteDlg(true))}>
                  <MessageSquarePlus className="h-4 w-4" /> 新增備註
                </Button>
              }
            />
            <CardBody>
              <Timeline events={events} />
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="顧客與收件資訊" />
            <CardBody className="space-y-3 text-[13px]">
              <Row label="收件人" value={addr.name} />
              <Row label="電話" value={addr.phone} />
              <Row label="Email" value={order.email} />
              <Row label="配送方式" value={shippingMethodLabel(order.shippingMethod)} />
              {meta?.needsStore ? (
                <Row label="取貨門市" value={`${addr.storeName ?? "—"}${addr.storeId ? ` (${addr.storeId})` : ""}`} />
              ) : meta?.needsAddress ? (
                <Row label="地址" value={`${addr.zip} ${addr.city}${addr.district}${addr.line1}`.trim() || "—"} />
              ) : null}
              {order.note && <Row label="顧客備註" value={order.note} />}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="付款資訊" />
            <CardBody className="space-y-3 text-[13px]">
              <Row label="付款方式" value={paymentProviderLabel(order.paymentProvider)} />
              <Row label="狀態" value={<PaymentStatusBadge status={order.paymentStatus} />} />
              <Row label="交易編號" value={order.payment?.txnId ? <span className="font-mono text-xs">{order.payment.txnId}</span> : "—"} />
              <Row label="付款時間" value={formatDate(order.payment?.paidAt)} />
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="物流資訊" />
            <CardBody className="space-y-3 text-[13px]">
              {order.shipment ? (
                <>
                  <Row label="物流商" value={order.shipment.carrier} />
                  <Row label="追蹤號碼" value={order.shipment.trackingNo ? <span className="font-mono text-xs">{order.shipment.trackingNo}</span> : "—"} />
                  <Row label="狀態" value={<ShipmentStatusBadge status={order.shipment.status} />} />
                  <Row label="包裹數" value={String(order.shipment.packageCount)} />
                  <Row label="出貨時間" value={formatDate(order.shipment.shippedAt)} />
                  <Row label="送達時間" value={formatDate(order.shipment.deliveredAt)} />
                  {order.shipment.note && <Row label="備註" value={order.shipment.note} />}
                </>
              ) : (
                <p className="text-slate-500">尚未建立出貨單{canShip ? "，可點擊上方「建立出貨單」" : ""}。</p>
              )}
            </CardBody>
          </Card>
        </div>
      </div>

      {/* 狀態轉移 */}
      <Dialog
        open={!!statusDlg}
        onClose={() => setStatusDlg(null)}
        title={`將訂單狀態更新為「${statusDlg ? ORDER_STATUS_LABEL[statusDlg] : ""}」`}
        description={statusDlg === "cancelled" || statusDlg === "refunded" ? "商品庫存將自動回補。" : undefined}
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setStatusDlg(null)}>
              取消
            </Button>
            <Button
              variant={statusDlg === "cancelled" || statusDlg === "refunded" ? "danger" : "primary"}
              loading={busy}
              onClick={async () => {
                if (!statusDlg) return;
                if (await run(() => adminApi.orderStatus(order.id, statusDlg, statusNote || undefined), "狀態已更新")) setStatusDlg(null);
              }}
            >
              確認更新
            </Button>
          </>
        }
      >
        <Field label="備註 (選填)">
          <Textarea value={statusNote} onChange={(e) => setStatusNote(e.target.value)} rows={3} />
        </Field>
      </Dialog>

      {/* 建立出貨單 */}
      <Dialog
        open={shipDlg}
        onClose={() => setShipDlg(false)}
        title="建立出貨單"
        description={`配送方式：${shippingMethodLabel(order.shippingMethod)} (${meta?.carrier})`}
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setShipDlg(false)}>
              取消
            </Button>
            <Button
              loading={busy}
              onClick={async () => {
                const ok = await run(
                  () => adminApi.createShipment(order.id, { trackingNo: ship.trackingNo.trim() || undefined, packageCount: Math.max(1, Number(ship.packageCount) || 1), note: ship.note || undefined }),
                  "出貨單已建立，訂單已標記為已出貨",
                );
                if (ok) setShipDlg(false);
              }}
            >
              建立並出貨
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="追蹤號碼" hint="留空則由系統產生">
            <Input value={ship.trackingNo} onChange={(e) => setShip({ ...ship, trackingNo: e.target.value })} />
          </Field>
          <Field label="包裹數">
            <Input type="number" min={1} value={ship.packageCount} onChange={(e) => setShip({ ...ship, packageCount: e.target.value })} className="w-24" />
          </Field>
          <Field label="備註">
            <Textarea value={ship.note} onChange={(e) => setShip({ ...ship, note: e.target.value })} rows={2} />
          </Field>
        </div>
      </Dialog>

      {/* 更新物流 */}
      <Dialog
        open={trackDlg}
        onClose={() => setTrackDlg(false)}
        title="更新物流資訊"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setTrackDlg(false)}>
              取消
            </Button>
            <Button
              loading={busy}
              onClick={async () => {
                if (await run(() => adminApi.updateShipment(order.id, { trackingNo: track.trackingNo || undefined, status: track.status || undefined }), "物流資訊已更新")) setTrackDlg(false);
              }}
            >
              儲存
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="追蹤號碼">
            <Input value={track.trackingNo} onChange={(e) => setTrack({ ...track, trackingNo: e.target.value })} />
          </Field>
          <Field label="物流狀態">
            <Select value={track.status} onChange={(e) => setTrack({ ...track, status: e.target.value })}>
              {SHIPMENT_STATUS_OPTIONS.map(([k, l]) => (
                <option key={k} value={k}>
                  {l}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </Dialog>

      {/* 備註 */}
      <Dialog
        open={noteDlg}
        onClose={() => setNoteDlg(false)}
        title="新增內部備註"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setNoteDlg(false)}>
              取消
            </Button>
            <Button
              loading={busy}
              disabled={!note.trim()}
              onClick={async () => {
                if (await run(() => adminApi.addOrderNote(order.id, note.trim()), "備註已新增")) setNoteDlg(false);
              }}
            >
              新增
            </Button>
          </>
        }
      >
        <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={4} placeholder="僅後台人員可見" />
      </Dialog>
    </>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="shrink-0 text-slate-500">{label}</span>
      <span className="text-right text-slate-800 break-words">{value || "—"}</span>
    </div>
  );
}

function Thumb({ src }: { src: string | null }) {
  const [broken, setBroken] = React.useState(false);
  return (
    <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-md border border-slate-200 bg-slate-50">
      {src && !broken ? <Image src={src} alt="" width={44} height={44} unoptimized className="h-full w-full object-cover" onError={() => setBroken(true)} /> : <ImageOff className="h-4 w-4 text-slate-300" />}
    </div>
  );
}

function Timeline({ events }: { events: OrderEvent[] }) {
  if (events.length === 0) return <p className="text-[13px] text-slate-400">尚無事件</p>;
  return (
    <ol className="relative space-y-4 border-l border-slate-200 pl-5">
      {events.map((e) => (
        <li key={e.id} className="relative">
          <span className={`absolute top-1.5 -left-[25px] h-2.5 w-2.5 rounded-full ring-4 ring-white ${eventTone[e.type] ?? "bg-slate-400"}`} />
          <p className="text-[13px] text-slate-800">{e.message}</p>
          <p className="mt-0.5 text-xs text-slate-400">
            {formatDate(e.createdAt)} · {e.actor}
          </p>
        </li>
      ))}
    </ol>
  );
}

export type { OrderDTO };
