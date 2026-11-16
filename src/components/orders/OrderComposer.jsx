
import { useState } from "react";
import { menu } from "../../services/ordersApi";

export default function OrderComposer({ onSend, loading }) {
  const [quantities, setQuantities] = useState({});

  function changeQuantity(productId, value) {
    setQuantities((previous) => ({
      ...previous,
      [productId]: Math.max(0, Number(value)),
    }));
  }

  function handleSubmit() {
    const items = Object.entries(quantities)
      .filter(([_, quantity]) => quantity > 0)
      .map(([productId, quantity]) => ({
        productId: Number(productId),
        quantity,
      }));

    if (!items.length) {
      alert("Escolha pelo menos um produto.");
      return;
    }

    onSend(items);
    setQuantities({});
  }

  return (
    <section className="order-composer">
      <h2>Cardápio</h2>

      {["Entrada", "Principal", "Sobremesa", "Bebida"].map(
        (category) => (
          <div key={category} className="menu-category">
            <h3>{category}</h3>

            <div className="menu-products">
              {menu
                .filter((product) => product.category === category)
                .map((product) => (
                  <div className="product-card" key={product.id}>
                    <div>
                      <strong>{product.name}</strong>
                      <p>
                        R$ {product.price.toFixed(2).replace(".", ",")}
                      </p>
                    </div>

                    <input
                      type="number"
                      min="0"
                      value={quantities[product.id] || 0}
                      onChange={(event) =>
                        changeQuantity(product.id, event.target.value)
                      }
                    />
                  </div>
                ))}
            </div>
          </div>
        )
      )}

      <button
        className="primary-button"
        onClick={handleSubmit}
        disabled={loading}
      >
        {loading ? "Enviando..." : "Enviar pedido"}
      </button>
    </section>
  );
}
