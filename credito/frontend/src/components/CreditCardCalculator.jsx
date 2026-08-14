"use client";

import Image from "next/image";
import { useReactToPrint } from "react-to-print";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/app/context/AuthContext";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { db } from "@/service/firebase";
import { doc, setDoc, onSnapshot, serverTimestamp } from "firebase/firestore";
import { parseCoeficientesGlobales } from "@/lib/coeficientes/coeficientesNucleoModel";
import {
  calcularValorCuota,
  recalcularCeldaCoeficiente,
  recalcularTablaCoeficientes,
} from "@/lib/coeficientes/coeficientesCalculo";

const installments = ["Débito", 1, 2, 3, 6, 9, 12];

// 🔹 Estructuras base
const initialCoefficients = {
  installments: ["Débito", 1, 2, 3, 6, 9, 12],
  cards: {
    VISA: [
      { puro: 0.8, final: 0 },
      { puro: 1.02, final: 0 },
      { puro: 1.03, final: 0 },
      { puro: 1.05, final: 0 },
      { puro: 1.09, final: 0 },
      { puro: 1.12, final: 0 },
      { puro: 1.17, final: 0 },
    ],
    MASTER: [
      { puro: 0.8, final: 0 },
      { puro: 1.02, final: 0 },
      { puro: 1.03, final: 0 },
      { puro: 1.05, final: 0 },
      { puro: 1.09, final: 0 },
      { puro: 1.12, final: 0 },
      { puro: 1.17, final: 0 },
    ],
    AMEX: [
      { puro: 0.8, final: 0 },
      { puro: 1.02, final: 0 },
      { puro: 1.03, final: 0 },
      { puro: 1.05, final: 0 },
      { puro: 1.09, final: 0 },
      { puro: 1.12, final: 0 },
      { puro: 1.17, final: 0 },
    ],
    CABAL: [
      { puro: 0.8, final: 0 },
      { puro: 1.02, final: 0 },
      { puro: 1.03, final: 0 },
      { puro: 1.05, final: 0 },
      { puro: 1.09, final: 0 },
      { puro: 1.12, final: 0 },
      { puro: 1.17, final: 0 },
    ],
  },
};

const initialDirectRates = {
  installments: ["Débito", 1, 2, 3, 6, 9, 12],
  cards: {
    VISA: [0, 0, 0, 0, 0, 0, 0],
    MASTER: [0, 0, 0, 0, 0, 0, 0],
    AMEX: [0, 0, 0, 0, 0, 0, 0],
    CABAL: [0, 0, 0, 0, 0, 0, 0],
  },
};

export default function CoeficientesNucleo() {
  const { isAdmin, loading } = useAuth();
  const isEditable = isAdmin;
  // --- Mover useReactToPrint justo después de useRef para mantener orden de hooks
  const printRef = useRef(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: "Tasas - Coeficientes Tarjetas",
    removeAfterPrint: true,
    onAfterPrint: () => console.log("🖨️ Impresión completada correctamente"),
  });
  // Estados (sin cambiar nada visual ni nombres)
  const [basePrice, setBasePrice] = useState(1000);
  const [arancelDeb, setArancelDeb] = useState(0.8);
  const [arancelCre, setArancelCre] = useState(1.8);
  const [interes, setInteres] = useState(1.14);
  const [coefficients, setCoefficients] = useState(structuredClone(initialCoefficients));
  const [directRates, setDirectRates] = useState(structuredClone(initialDirectRates));
  const [prices, setPrices] = useState({ installments: [], cards: {} }); // agregado para uso en guardado
  const [saving, setSaving] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [newCardName, setNewCardName] = useState("");
  const [newInstallment, setNewInstallment] = useState("");



  // Mantener orden fijo de tarjetas
  const cardOrder = ["VISA", "MASTER", "AMEX", "CABAL"];
  // 🔥 ORDEN FORZADO DE CUOTAS
// Débito primero siempre, luego cuotas numéricas en orden, luego strings
const sortInstallments = (arr) => {
  return [...arr].sort((a, b) => {
    // Débito SIEMPRE primero
    if (a === "Débito") return -1;
    if (b === "Débito") return 1;

    const aNum = !isNaN(a);
    const bNum = !isNaN(b);

    // Si ambos son números, orden natural
    if (aNum && bNum) return Number(a) - Number(b);

    // Si uno es número → va primero
    if (aNum && !bNum) return -1;
    if (!aNum && bNum) return 1;

    // Ambos string → orden alfabético
    return a.toString().localeCompare(b.toString());
  });
};

// ⬇️ FORZAR ORDEN AL CARGAR INFO
useEffect(() => {
  setCoefficients((prev) => ({
    ...prev,
    installments: sortInstallments(prev.installments),
  }));
}, []);


  // 🔹 Función de ordenamiento reutilizable
  // 🔹 Orden: primero las tarjetas del orden fijo, luego numéricas, y los string al final
  const sortCards = (cardsObj) => {
    return Object.fromEntries(
      Object.entries(cardsObj).sort(([a], [b]) => {
        const ai = cardOrder.indexOf(a);
        const bi = cardOrder.indexOf(b);

        // 🟦 Primero respetamos el orden fijo
        if (ai !== -1 && bi !== -1) return ai - bi;
        if (ai !== -1) return -1;
        if (bi !== -1) return 1;

        // 🟩 Si ninguno está en cardOrder ↓
        const aIsString = isNaN(a);
        const bIsString = isNaN(b);

        // ⬇ Los string SIEMPRE van al final
        if (aIsString && !bIsString) return 1;
        if (!aIsString && bIsString) return -1;

        // 🟧 Si ambos son string → orden alfabético
        if (aIsString && bIsString) return a.localeCompare(b);

        // 🟪 Si ambos son numéricos → comparación numérica
        return Number(a) - Number(b);
      })
    );
  };

  // 🔹 Cargar datos Firestore (igual que tu original)
  useEffect(() => {
    const ref = doc(db, "coeficientes", "coeficientesNucleo");
    const unsub = onSnapshot(ref, async (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        const parsedCards = {};
        for (const [card, arr] of Object.entries(data.coefficients?.cards || {})) {
          parsedCards[card] = arr.map((v) =>
            typeof v === "object" ? v : { puro: Number(v) || 0, final: 0 }
          );
        }

        setBasePrice(data.basePrice || 1000);
        const globales = parseCoeficientesGlobales(data);
        setArancelDeb(globales.arancelDeb);
        setArancelCre(globales.arancelCre);
        setInteres(globales.interes);
        setCoefficients({
          installments: data.coefficients?.installments || initialCoefficients.installments,
          cards: parsedCards,
        });
        setDirectRates(data.directRates || structuredClone(initialDirectRates));
        setPrices(
          data.prices ||
          structuredClone({
            installments: data.coefficients?.installments || initialCoefficients.installments,
            cards: {},
          })
        );
        setLastUpdate(data.updatedAt?.toDate?.()?.toLocaleString() || null);
      } else {
        await setDoc(ref, {
          basePrice: 1000,
          arancelDeb: 0.80,
          arancelCre: 1.8,
          interes: 1.14,
          coefficients: structuredClone(initialCoefficients),
          directRates: structuredClone(initialDirectRates),
          prices: { installments: initialCoefficients.installments, cards: {} },
          updatedAt: serverTimestamp(),
        });
      }
      setLoadingData(false);
    });

    return () => unsub();
  }, []);

  useEffect(() => {
    if (!coefficients?.cards || loadingData) {
      return;
    }

    const { coefficients: nextCoefficients, directRates: nextDirectRates } =
      recalcularTablaCoeficientes(coefficients, {
        arancelDeb: Number(arancelDeb) || 0,
        arancelCre: Number(arancelCre) || 0,
        interes: Number(interes) || 0,
        basePrice: Number(basePrice) || 0,
      });

    setCoefficients((prev) => {
      const same =
        JSON.stringify(prev.cards) === JSON.stringify(nextCoefficients.cards);
      return same ? prev : nextCoefficients;
    });

    setDirectRates((prev) => {
      const same =
        JSON.stringify(prev.cards) === JSON.stringify(nextDirectRates.cards);
      return same ? prev : nextDirectRates;
    });
  }, [arancelDeb, arancelCre, interes, basePrice, coefficients.installments, loadingData]);

  const handleCoefficientChange = (card, idx, value, inst) => {
    setCoefficients((prev) => {
      const next = structuredClone(prev);
      if (!next.cards[card][idx]) {
        next.cards[card][idx] = {};
      }

      const isDisabledVisual = value.trim() === "" || value.trim() === "-0";
      const recalculated = recalcularCeldaCoeficiente({
        inst,
        puro: isDisabledVisual ? value.trim() : Number(value) || 0,
        arancelDeb,
        arancelCre,
        interes,
        basePrice,
        isDisabledVisual,
      });

      next.cards[card][idx] = {
        ...next.cards[card][idx],
        ...recalculated,
        puro: isDisabledVisual ? value.trim() : recalculated.puro,
      };

      return next;
    });
  };


  // 🔹 Guardar todos los cambios (solo al presionar guardar)
  const handleSaveAll = async () => {
    if (!isEditable) return;
    setSaving(true);

    try {
      const { coefficients: newCoefficients, directRates: newDirectRates } =
        recalcularTablaCoeficientes(coefficients, {
          arancelDeb: Number(arancelDeb) || 0,
          arancelCre: Number(arancelCre) || 0,
          interes: Number(interes) || 0,
          basePrice: Number(basePrice) || 0,
        });

      const newPrices = {
        installments: newCoefficients.installments,
        cards: {},
      };

      for (const [card, arr] of Object.entries(newCoefficients.cards)) {
        newPrices.cards[card] = arr.map((obj) => obj.precioFinanciado ?? 0);
      }

      // Guardar en Firestore (solo datos operativos; parámetros globales en Ajustes)
      await setDoc(
        doc(db, "coeficientes", "coeficientesNucleo"),
        {
          basePrice,
          coefficients: newCoefficients,
          directRates: newDirectRates,
          prices: newPrices,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      // Actualizar estados locales
      setCoefficients(newCoefficients);
      setDirectRates(newDirectRates);
      setPrices(newPrices);

      alert("✅ Configuración guardada correctamente");
    } catch (err) {
      console.error(err);
      alert("❌ Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  // 🔹 Agregar tarjeta (mantengo tu implementación exacta)
  // 🔹 Agregar tarjeta (corregido — usa setCoefficients en vez de setCards)
  const handleAddCard = () => {
    if (!newCardName || !newCardName.trim()) return alert("Ingresá un nombre de tarjeta");

    const clean = newCardName.trim();

    // Si ya existe la tarjeta, aviso y salgo
    if (coefficients.cards?.[clean]) {
      setNewCardName("");
      return alert("⚠️ Esa tarjeta ya existe");
    }

    setCoefficients((prev) => {
      const next = structuredClone(prev);

      // Aseguro que existe el array de installments y tomo su longitud
      const len = (next.installments || []).length || 0;

      // Creo la estructura base para la nueva tarjeta (cada cuota un objeto)
      const base = Array.from({ length: len }, () => ({ puro: 0, final: 0 }));

      // Inserto la nueva tarjeta
      next.cards = { ...(next.cards || {}), [clean]: base };

      // Aplico sortCards para que respete tu orden (y deje strings al final)
      next.cards = sortCards(next.cards);

      return next;
    });

    setNewCardName("");
  };




  const handleDeleteCard = (card) => {
    if (!confirm(`¿Eliminar tarjeta "${card}"?`)) return;
    setCoefficients((p) => {
      const next = structuredClone(p);
      delete next.cards[card];
      return next;
    });
    setDirectRates((p) => {
      const next = structuredClone(p);
      delete next.cards[card];
      return next;
    });
  };

  // 🔹 Agregar cuota correlativa (respeta ["Débito",1,2,3,6,9,12,18,24,...])
  function handleAddInstallment() {
    const raw = newInstallment?.trim();

    if (!raw) {
      alert("Ingrese un valor");
      return;
    }

    const isNumber = /^\d+$/.test(raw); // Solo dígitos → número válido

    // --- SI ES NÚMERO ---
    if (isNumber) {
      const num = parseInt(raw, 10);

      if (num <= 0) {
        alert("Ingrese un número de cuotas válido");
        return;
      }

      if (coefficients.installments.includes(num)) {
        alert("⚠️ Esa cuota ya existe");
        return;
      }

      setCoefficients(prev => {
        const next = structuredClone(prev);

        next.installments.push(num);

        // mantener orden numérico
        next.installments.sort((a, b) => a - b);

        // agregar estructura a cada tarjeta existente
        Object.keys(next.cards).forEach(card => {
          next.cards[card].push({ puro: 0, final: 0 });
        });

        return next;
      });

      setNewInstallment("");
      return;
    }

    // --- SI ES STRING ---
    const str = raw.toUpperCase();

    if (coefficients.installments.includes(str)) {
      alert("⚠️ Esa cuota ya existe");
      return;
    }

    setCoefficients(prev => {
      const next = structuredClone(prev);

      next.installments.push(str);

      // deja strings al final
      next.installments = next.installments.sort((a, b) => {
        const an = /^\d+$/.test(a);
        const bn = /^\d+$/.test(b);
        if (an && !bn) return -1;
        if (!an && bn) return 1;
        return an && bn ? a - b : 0;
      });

      // agregar base para todas las tarjetas
      Object.keys(next.cards).forEach(card => {
        next.cards[card].push({ puro: 0, final: 0 });
      });

      return next;
    });

    setNewInstallment("");
  }


  if (loading || loadingData) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <div className="mr-3 h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        Cargando coeficientes…
      </div>
    );
  }



  // 🔥 Ordenar tarjetas garantizando que DÉBITO quede siempre primero
  const orderedCards = Object.keys(coefficients.cards);
// 🔹 Ordenar cuotas dejando siempre "Débito" primero
const orderedInstallments = [...coefficients.installments].sort((a, b) => {
  if (a === "Débito") return -1;
  if (b === "Débito") return 1;

  return Number(a) - Number(b); // orden numérico
});


  const inputClass =
    "bg-card border-border text-foreground focus:ring-red-500/40";
  const tableHeadClass =
    "border border-border px-2 py-2 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground";
  const tableCellClass = "border border-border px-2 py-2 text-center text-muted-foreground";
  const tableDisabledClass =
    "bg-accent text-muted-foreground";
  const sectionTitleClass =
    "text-sm font-bold uppercase tracking-wider text-red-400";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-end gap-3 print:hidden">
        {isEditable && (
          <Button
            variant="primary"
            onClick={handleSaveAll}
            disabled={saving}
          >
            {saving ? "Guardando..." : "Guardar cambios"}
          </Button>
        )}

        <Button
          onClick={() => {
            if (!printRef.current) {
              alert("❌ No se encontró el contenido para imprimir");
              console.error("🧩 printRef.current:", printRef.current);
              return;
            }
            handlePrint();
          }}
          variant="secondary"
        >
          Imprimir / Exportar
        </Button>
      </div>

      <div
        className="rounded-2xl border border-border bg-muted p-4 md:p-6 print:bg-white print:text-black print:border-gray-300"
        ref={printRef}
      >
          {/* ENCABEZADO */}
          <div className="flex justify-between items-center mb-4">
            <div>
              <div className="text-sm text-muted-foreground print:text-gray-700">Grupo Núcleo S.A.</div>
              <div className="text-xs text-muted-foreground print:text-gray-500">Coeficientes Grupo Núcleo S.A.</div>
            </div>

            <div className="w-28 h-14 relative">
              <Image
                src="/logo-grupo-nucleo.png"
                alt="Grupo Núcleo"
                fill
                style={{ objectFit: "contain" }}
              />
            </div>
          </div>

          {lastUpdate && (
            <p className="text-sm text-muted-foreground mb-3 print:text-gray-600">
              Última actualización: {lastUpdate}
            </p>
          )}

          {/* CONTROLES */}
          <div className="mb-6 print:hidden space-y-3">
            <div className="max-w-xs">
              <Label className="text-muted-foreground">PVP contado</Label>
              <Input
                type="number"
                value={basePrice}
                onChange={e => setBasePrice(Number(e.target.value))}
                className={inputClass}
              />
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Arancel Débito ({arancelDeb}%), Arancel Crédito ({arancelCre}%) e
              Interés ({interes}%) se configuran en{" "}
              <Link
                href="/dashboard/ajustes/coeficientes-y-tasas"
                className="text-sky-300 hover:text-sky-200"
              >
                Ajustes → Coeficientes y Tasas
              </Link>
              .
            </p>
          </div>

          {/* COEFICIENTES */}
          <section className="mb-8">
            <div className="flex justify-between items-center mb-2">
              <h3 className={sectionTitleClass}>
                COEFICIENTES TARJETAS
              </h3>

              {isEditable && (
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Nueva tarjeta..."
                    value={newCardName}
                    onChange={e => setNewCardName(e.target.value)}
                    className={`w-40 print:hidden ${inputClass}`}
                  />

                  <Button onClick={handleAddCard} size="sm" variant="primary" className="print:hidden">
                    Agregar tarjeta
                  </Button>

                  {/* 🗑️ Eliminar tarjeta */}
                  <Button
                    onClick={() => {
                      const cardToDelete = prompt(
                        "Ingrese el nombre exacto de la tarjeta a eliminar:"
                      );
                      if (!cardToDelete) return;

                      if (!coefficients.cards[cardToDelete]) {
                        alert("⚠️ Esa tarjeta no existe");
                        return;
                      }

                      if (!confirm(`¿Eliminar la tarjeta "${cardToDelete}"?`))
                        return;

                      setCoefficients(prev => {
                        const next = structuredClone(prev);
                        delete next.cards[cardToDelete];
                        return next;
                      });

                      setDirectRates(prev => {
                        const next = structuredClone(prev);
                        delete next.cards[cardToDelete];
                        return next;
                      });
                    }}
                    size="sm"
                    className="print:hidden border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20"
                  >
                    🗑️ Eliminar tarjeta
                  </Button>
                  {/* ➕ Input de nueva cuota */}
                  <Input
                    placeholder="Nueva cuota..."
                    value={newInstallment}
                    onChange={(e) => setNewInstallment(e.target.value)}
                    className={`w-32 print:hidden ${inputClass}`}
                  />

                  {/* ➕ Agregar cuota */}
                  <Button
                    onClick={() => handleAddInstallment()}
                    size="sm"
                    variant="primary"
                    className="print:hidden"
                  >
                    Agregar cuota
                  </Button>

                  {/* 🗑️ Eliminar cuota */}
                  <Button
                    onClick={() => {
                      const cuotaToDelete = prompt(
                        "Ingrese el nombre o número de la cuota a eliminar:"
                      );
                      if (!cuotaToDelete) return;

                      setCoefficients(prev => {
                        const next = structuredClone(prev);
                        const i = next.installments.indexOf(
                          Number(cuotaToDelete)
                        );

                        if (i === -1) {
                          alert("⚠️ Esa cuota no existe");
                          return prev;
                        }

                        if (!confirm(`¿Eliminar la cuota "${cuotaToDelete}"?`))
                          return prev;

                        next.installments.splice(i, 1);

                        for (const card of Object.keys(next.cards)) {
                          next.cards[card].splice(i, 1);
                        }

                        return next;
                      });

                      setDirectRates(prev => {
                        const next = structuredClone(prev);
                        const i = next.installments.indexOf(
                          Number(cuotaToDelete)
                        );

                        if (i === -1) return prev;

                        next.installments.splice(i, 1);

                        for (const card of Object.keys(next.cards)) {
                          next.cards[card].splice(i, 1);
                        }

                        return next;
                      });
                    }}
                    size="sm"
                    className="print:hidden border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20"
                  >
                    🗑️ Eliminar cuota
                  </Button>
                </div>
              )}
            </div>

            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-card">
                    <th className={tableHeadClass}>
                      Cuotas
                    </th>

                    {orderedCards.map(card => (
                      <th
                        key={card}
                        className={tableHeadClass}
                      >
                        {card}

                        {isEditable && (
                          <button
                            onClick={() => handleDeleteCard(card)}
                            className="ml-1 text-red-400 hover:text-red-300 text-xs"
                          >
                            🗑️
                          </button>
                        )}
                      </th>
                    ))}

                    {isEditable && (
                      <th className={tableHeadClass}>
                        Acción
                      </th>
                    )}
                  </tr>
                </thead>

                <tbody>
                  {orderedInstallments.map((inst, idx) => (
                    <tr key={inst} className="hover:bg-card/40">
                      <td className={`${tableCellClass} text-muted-foreground`}>
                        {inst}
                      </td>

                      {orderedCards.map(card => {
                        const cell = coefficients.cards[card]?.[idx] ?? {};

                        return (
                          <td
                            key={card}
                            className={`${tableCellClass} ${cell.isDisabledVisual
                              ? tableDisabledClass
                              : ""
                              }`}
                          >
                            {isEditable ? (
                              <div className="flex flex-col items-center ">
                                <input
                                  type="text"
                                  value={cell.puro ?? ""}
                                  onChange={e =>
                                    handleCoefficientChange(
                                      card,
                                      idx,
                                      e.target.value,
                                      inst
                                    )
                                  }
                                  className={`w-full text-center border mb-1 print:hidden ${cell.isDisabledVisual
                                    ? `${tableDisabledClass} border-border`
                                    : `${inputClass}`
                                    }`}
                                />

                                <span
                                  className={`text-xs print:block ${cell.isDisabledVisual
                                    ? "text-muted-foreground"
                                    : "text-red-400"
                                    }`}
                                >
                                  {cell.isDisabledVisual
                                    ? "-"
                                    : `${cell.final ?? 0}%`}
                                </span>
                              </div>
                            ) : (
                              <span className="text-red-400 tabular-nums">
                                {cell.isDisabledVisual
                                  ? "-"
                                  : `${cell.final ?? 0}%`}
                              </span>
                            )}
                          </td>
                        );
                      })}

                      {isEditable && inst !== "Débito" && (
                        <td className={tableCellClass}>
                          <button
                            onClick={() => {
                              if (!confirm(`¿Eliminar la cuota "${inst}"?`))
                                return;

                              setCoefficients(prev => {
                                const next = structuredClone(prev);
                                const i = next.installments.indexOf(inst);

                                if (i > -1) {
                                  next.installments.splice(i, 1);

                                  for (const card of Object.keys(next.cards)) {
                                    next.cards[card].splice(i, 1);
                                  }
                                }

                                return next;
                              });

                              setDirectRates(prev => {
                                const next = structuredClone(prev);
                                const i = next.installments.indexOf(inst);

                                if (i > -1) {
                                  next.installments.splice(i, 1);

                                  for (const card of Object.keys(next.cards)) {
                                    next.cards[card].splice(i, 1);
                                  }
                                }

                                return next;
                              });
                            }}
                            className="text-red-400 hover:text-red-300 text-xs"
                          >
                            🗑️
                          </button>
                        </td>
                      )}

                      {isEditable && inst === "Débito" && (
                        <td className={`${tableCellClass} border-border`}></td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* TASA DIRECTA */}
          <section className="print:hidden mt-8">
            <h3 className={`${sectionTitleClass} mb-3`}>
              TASA DIRECTA
            </h3>

            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-card">
                    <th className={tableHeadClass}>Cuotas</th>
                    {orderedCards.map(card => (
                      <th key={card} className={tableHeadClass}>{card}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {orderedInstallments.map((inst, idx) => (
                    <tr key={idx} className="hover:bg-card/40">
                      <td className={`${tableCellClass} text-muted-foreground`}>{inst}</td>
                      {orderedCards.map(card => (
                        <td
                          key={card}
                          className={`${tableCellClass} tabular-nums ${coefficients.cards[card]?.[idx]?.isDisabledVisual
                            ? tableDisabledClass
                            : "text-red-400"
                            }`}
                        >
                          {coefficients.cards[card]?.[idx]?.isDisabledVisual
                            ? "-"
                            : `${coefficients.cards[card]?.[idx]?.tasaDirecta ?? "-"} %`}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* VALOR CUOTA */}
          <section className="print:hidden mt-8">
            <h3 className={`${sectionTitleClass} mb-3`}>
              VALOR CUOTA
            </h3>

            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-card">
                    <th className={tableHeadClass}>Cuotas</th>
                    {orderedCards.map(card => (
                      <th key={card} className={tableHeadClass}>{card}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {orderedInstallments.map((inst, idx) => (
                    <tr key={idx} className="hover:bg-card/40">
                      <td className={`${tableCellClass} text-muted-foreground`}>{inst}</td>
                      {orderedCards.map(card => (
                        <td
                          key={card}
                          className={`${tableCellClass} tabular-nums ${coefficients.cards[card]?.[idx]?.isDisabledVisual
                            ? tableDisabledClass
                            : "text-foreground"
                            }`}
                        >
                          {coefficients.cards[card]?.[idx]?.isDisabledVisual
                            ? "-"
                            : `$${Number(
                                coefficients.cards[card]?.[idx]?.valorCuota ??
                                  calcularValorCuota(
                                    basePrice,
                                    coefficients.cards[card]?.[idx]?.final ?? 0,
                                    inst,
                                    arancelDeb,
                                    arancelCre
                                  )
                              ).toLocaleString("es-AR", {
                                minimumFractionDigits: 2,
                              })}`}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* PRECIO FINANCIADO */}
          <section className="print:hidden mt-8">
            <h3 className={`${sectionTitleClass} mb-3`}>
              PRECIO FINANCIADO
            </h3>

            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-card">
                    <th className={tableHeadClass}>Cuotas</th>
                    {orderedCards.map(card => (
                      <th key={card} className={tableHeadClass}>{card}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {orderedInstallments.map((inst, idx) => (
                    <tr key={idx} className="hover:bg-card/40">
                      <td className={`${tableCellClass} text-muted-foreground`}>{inst}</td>
                      {orderedCards.map(card => (
                        <td
                          key={card}
                          className={`${tableCellClass} tabular-nums font-medium ${coefficients.cards[card]?.[idx]?.isDisabledVisual
                            ? tableDisabledClass
                            : "text-red-400"
                            }`}
                        >
                          {coefficients.cards[card]?.[idx]?.isDisabledVisual
                            ? "-"
                            : `$${(coefficients.cards[card]?.[idx]?.precioFinanciado ?? 0).toLocaleString(
                              "es-AR",
                              { minimumFractionDigits: 2 }
                            )}`}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <div className="flex justify-start mt-6 print:hidden">
            <Button
              asChild
              variant="secondary"
              className="border-border bg-transparent text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <Link href="/dashboard">← Volver al dashboard</Link>
            </Button>
          </div>
        </div>
    </div>
  );
}
