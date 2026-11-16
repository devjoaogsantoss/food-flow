
import { useEffect, useState } from "react";

import OrderComposer from "../components/orders/OrderComposer";
import OrderRounds from "../components/orders/OrderRounds";

import { ordersApi } from "../services/ordersApi";

import "../styles/orders.css";

export default function OrdersPage() {
  const [tables, setTables] = useState([]);
  const [commands, setCommands] = useState([]);
  const [selectedCommand, setSelectedCommand] = useState(null);

  const [profile, setProfile] = useState("garcom");
  const [loading, setLoading] = useState(false);

  const [beverage, setBeverage] = useState("");
  const [servingTime, setServingTime] = useState("");

  async function loadData() {
    const tableData = await ordersApi.getTables();
    const commandData = await ordersApi.getCommands();

    setTables(tableData);
    setCommands(commandData);

    if (selectedCommand) {
      const updatedCommand = await ordersApi.getCommand(
        selectedCommand.id
      );

      setSelectedCommand(updatedCommand);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function openCommand(commandId) {
    const command = await ordersApi.getCommand(commandId);
    setSelectedCommand(command);
  }

  async function sendOrder(items) {
    if (!selectedCommand) {
      alert("Selecione uma comanda primeiro.");
      return;
    }

    try {
      setLoading(true);

      await ordersApi.createOrder(
        selectedCommand.id,
        items,
        profile
      );

      await loadData();

      alert("Pedido enviado com sucesso!");
    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function deliverRound(roundId) {
    try {
      await ordersApi.deliverRound(
        selectedCommand.id,
        roundId
      );

      await loadData();

      alert("Entrega da rodada confirmada!");
    } catch (error) {
      alert(error.message);
    }
  }

  async function saveTasting() {
    if (!beverage || !servingTime) {
      alert("Informe a bebida e o horário.");
      return;
    }

    try {
      await ordersApi.saveTasting(selectedCommand.id, {
        beverage,
        servingTime,
      });

      await loadData();

      alert("Degustação registrada!");

      setBeverage("");
      setServingTime("");
    } catch (error) {
      alert(error.message);
    }
  }

  return (
    <main className="orders-page">
      <header className="orders-title">
        <h1>Food Flow - Pedidos</h1>
        <p>Gerenciamento de comandas e pedidos.</p>
      </header>

      <section className="profile-selector">
        <label htmlFor="profile">Visualização:</label>

        <select
          id="profile"
          value={profile}
          onChange={(event) => {
            setProfile(event.target.value);
          }}
        >
          <option value="garcom">Garçom</option>
          <option value="cliente">Cliente / Responsável pela reserva</option>
        </select>
      </section>

      <section className="tables-section">
        <h2>Mesas com comandas abertas</h2>

        <div className="tables-grid">
          {tables
            .filter((table) => table.status === "aberta")
            .map((table) => {
              const command = commands.find(
                (item) => item.id === table.commandId
              );

              return (
                <button
                  key={table.id}
                  className={
                    selectedCommand?.id === table.commandId
                      ? "table-card selected"
                      : "table-card"
                  }
                  onClick={() => openCommand(table.commandId)}
                >
                  <strong>Mesa {table.number}</strong>
                  <span>Comanda #{table.commandId}</span>
                  <span>
                    {command?.rounds.length || 0} rodada(s)
                  </span>
                </button>
              );
            })}
        </div>
      </section>

      {selectedCommand && (
        <section className="command-section">
          <h2>Comanda #{selectedCommand.id}</h2>

          <p>
            Mesa{" "}
            {
              tables.find(
                (table) => table.id === selectedCommand.tableId
              )?.number
            }
          </p>

          <OrderComposer
            onSend={sendOrder}
            loading={loading}
          />

          <OrderRounds
            command={selectedCommand}
            onDeliver={deliverRound}
            isWaiter={profile === "garcom"}
          />

          <section className="tasting-section">
            <h2>Degustação</h2>

            <label htmlFor="beverage">
              Bebida escolhida
            </label>

            <select
              id="beverage"
              value={beverage}
              onChange={(event) =>
                setBeverage(event.target.value)
              }
            >
              <option value="">Selecione uma bebida</option>
              <option value="Vinho">Vinho</option>
              <option value="Suco natural">Suco natural</option>
              <option value="Refrigerante">Refrigerante</option>
              <option value="Água">Água</option>
            </select>

            <label htmlFor="servingTime">
              Horário combinado para servir
            </label>

            <input
              id="servingTime"
              type="time"
              value={servingTime}
              onChange={(event) =>
                setServingTime(event.target.value)
              }
            />

            <button
              className="primary-button"
              onClick={saveTasting}
            >
              Salvar degustação
            </button>

            {selectedCommand.tasting && (
              <p>
                Bebida: {selectedCommand.tasting.beverage}
                <br />
                Horário: {selectedCommand.tasting.servingTime}
              </p>
            )}
          </section>
        </section>
      )}
    </main>
  );
}
