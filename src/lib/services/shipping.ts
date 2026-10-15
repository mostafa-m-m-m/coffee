import { db } from "@/lib/db";
import { ApiError } from "@/lib/api-error";
import { GOVERNORATES } from "@/lib/geo";
import { pick } from "@/lib/i18n/localized";
import { logActivity } from "@/lib/services/activity";
import { shippingFor } from "@/lib/pricing";
import type { ShippingZoneInput } from "@/lib/validations/shipping";

/** Fastest and slowest delivery across the shipping zones, for storefront copy like "2–5 days". */
export async function getDeliveryRange() {
  const { _min, _max } = await db.shippingZone.aggregate({
    _min: { etaDays: true },
    _max: { etaDays: true },
  });
  return { min: _min.etaDays ?? 0, max: _max.etaDays ?? 0 };
}

export const listZones = () => db.shippingZone.findMany({ orderBy: { sortOrder: "asc" } });

/** Price and delivery time for one governorate (and the shipping line for a given subtotal). */
export async function quoteShipping(governorate: string, subtotalCents?: number) {
  const zone = await db.shippingZone.findFirst({ where: { governorates: { has: governorate } } });
  if (!zone)
    throw new ApiError(400, "VALIDATION", {
      fields: { governorate: "validation.governorateInvalid" },
    });
  return {
    zone: { id: zone.id, name: zone.name },
    feeCents: zone.feeCents,
    etaDays: zone.etaDays,
    ...(subtotalCents !== undefined && {
      shippingCents: shippingFor(subtotalCents, zone.feeCents),
    }),
  };
}

/**
 * Edits a zone's fee, delivery time and governorates. A governorate belongs to exactly one zone, so
 * moving one here takes it out of the zone that had it, and an edit that would leave any of the 27
 * governorates without a zone is refused (an order to it could not be priced).
 */
export async function updateZone(id: string, input: ShippingZoneInput, actorId: string | null) {
  return db.$transaction(async (tx) => {
    const zones = await tx.shippingZone.findMany();
    const zone = zones.find((z) => z.id === id);
    if (!zone) throw new ApiError(404, "NOT_FOUND");

    const mine = new Set<string>(input.governorates);
    const covered = new Set(
      zones.flatMap((z) => (z.id === id ? [...mine] : z.governorates.filter((g) => !mine.has(g)))),
    );
    if (GOVERNORATES.some((g) => !covered.has(g))) {
      throw new ApiError(400, "VALIDATION", {
        fields: { governorates: "validation.governoratesUncovered" },
      });
    }

    for (const other of zones) {
      if (other.id === id) continue;
      const kept = other.governorates.filter((g) => !mine.has(g));
      if (kept.length !== other.governorates.length) {
        await tx.shippingZone.update({ where: { id: other.id }, data: { governorates: kept } });
      }
    }
    const feeCents = Math.round(input.fee * 100);
    const updated = await tx.shippingZone.update({
      where: { id },
      data: { feeCents, etaDays: input.etaDays, governorates: input.governorates },
    });
    await logActivity(tx, {
      actorId,
      action: "shipping_zone_updated",
      entity: "shipping_zone",
      entityId: id,
      label: pick(zone.name, "en") || pick(zone.name, "ar"),
      name: zone.name,
      details: {
        feeFrom: zone.feeCents,
        feeTo: feeCents,
        etaFrom: zone.etaDays,
        etaTo: input.etaDays,
        governorates: input.governorates.length,
      },
    });
    return updated;
  });
}
