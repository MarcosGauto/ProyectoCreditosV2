"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Edit2, Save, X, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function FinancingTable() {
  const [baseRate, setBaseRate] = useState(3.5);
  const [daysList, setDaysList] = useState([
    120, 90, 75, 60, 45, 30, 21, 15, 10, 7,
  ]);
  const [isEditingBase, setIsEditingBase] = useState(false);
  const [editBaseValue, setEditBaseValue] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [newDays, setNewDays] = useState("");

  useEffect(() => {
    const savedBaseRate = localStorage.getItem("baseRate");
    const savedDaysList = localStorage.getItem("daysList");

    if (savedBaseRate) {
      setBaseRate(parseFloat(savedBaseRate));
    }
    if (savedDaysList) {
      setDaysList(JSON.parse(savedDaysList));
    }
  }, []);

  const calculateRate = (days) => {
    const multiplier = days / 30;
    return Number((baseRate * multiplier).toFixed(2));
  };

  const rates = [...daysList]
    .sort((a, b) => b - a)
    .map((days) => ({
      days,
      rate: calculateRate(days),
    }));

  const startEditBase = () => {
    setIsEditingBase(true);
    setEditBaseValue(baseRate.toString());
  };

  const cancelEditBase = () => {
    setIsEditingBase(false);
    setEditBaseValue("");
  };

  const saveBaseRate = () => {
    const newRate = parseFloat(editBaseValue);

    if (isNaN(newRate) || newRate < 0) {
      alert("Por favor ingresa un porcentaje válido");
      return;
    }

    setBaseRate(newRate);
    localStorage.setItem("baseRate", newRate.toString());
    setIsEditingBase(false);
    setEditBaseValue("");
  };

  const addNewDays = () => {
    const days = parseInt(newDays, 10);

    if (isNaN(days) || days <= 0) {
      alert("Por favor ingresa un número de días válido");
      return;
    }

    if (daysList.includes(days)) {
      alert("Ya existe una tasa para esos días");
      return;
    }

    const updatedDaysList = [...daysList, days].sort((a, b) => b - a);

    setDaysList(updatedDaysList);
    localStorage.setItem("daysList", JSON.stringify(updatedDaysList));
    setIsAdding(false);
    setNewDays("");
  };

  const cancelAdd = () => {
    setIsAdding(false);
    setNewDays("");
  };

  const deleteDays = (days) => {
    if (days === 30) {
      alert("No puedes eliminar la tasa base de 30 días");
      return;
    }

    const updatedDaysList = daysList.filter((d) => d !== days);
    setDaysList(updatedDaysList);
    localStorage.setItem("daysList", JSON.stringify(updatedDaysList));
  };

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-border bg-muted p-6">
          <p className="text-sm font-medium text-muted-foreground mb-3">
            Tasa base a 30 días
          </p>
          {isEditingBase ? (
            <div className="flex flex-wrap items-center gap-3">
              <Input
                type="number"
                step="0.01"
                value={editBaseValue}
                onChange={(e) => setEditBaseValue(e.target.value)}
                className="bg-card border-border text-foreground text-3xl font-bold max-w-[150px] focus:ring-red-500/40"
                autoFocus
              />
              <span className="text-3xl font-bold text-foreground">%</span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="primary"
                  onClick={saveBaseRate}
                >
                  <Save className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={cancelEditBase}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-4">
              <p className="text-5xl font-bold text-foreground tabular-nums">
                {baseRate.toFixed(2)}%
              </p>
              <Button
                size="sm"
                variant="ghost"
                onClick={startEditBase}
              >
                <Edit2 className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end">
        {!isAdding && (
          <Button
            variant="primary"
            onClick={() => setIsAdding(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Agregar días
          </Button>
        )}
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-muted">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px]">
            <thead>
              <tr className="border-b border-border bg-card">
                <th className="text-left py-4 px-6 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Días
                </th>
                <th className="text-center py-4 px-6 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Tasa de interés
                </th>
                <th className="text-right py-4 px-6 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {isAdding && (
                <tr className="border-b border-border bg-red-500/5">
                  <td className="py-4 px-6">
                    <Input
                      type="number"
                      placeholder="Días"
                      value={newDays}
                      onChange={(e) => setNewDays(e.target.value)}
                      className="bg-card border-border text-foreground max-w-[120px] focus:ring-red-500/40"
                      autoFocus
                    />
                  </td>
                  <td className="py-4 px-6 text-center">
                    <span className="text-lg text-muted-foreground tabular-nums">
                      {newDays && !isNaN(parseInt(newDays, 10))
                        ? `${calculateRate(parseInt(newDays, 10)).toFixed(2)}% (calculado)`
                        : "Auto-calculado"}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={addNewDays}
                      >
                        <Save className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={cancelAdd}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              )}

              {rates.map((item) => (
                <tr
                  key={item.days}
                  className={`border-b border-border transition-colors hover:bg-card/60 ${
                    item.days === 30 ? "bg-red-500/10" : ""
                  }`}
                >
                  <td className="py-4 px-6">
                    <span className="text-lg font-semibold text-foreground tabular-nums">
                      {item.days}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-center">
                    <span className="text-2xl font-bold text-red-400 tabular-nums">
                      {item.rate.toFixed(2)}%
                    </span>
                  </td>
                  <td className="py-4 px-6 text-right">
                    {item.days !== 30 && (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => deleteDays(item.days)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex justify-start print:hidden">
        <Button asChild variant="secondary">
          <Link href="/dashboard">← Volver al dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
