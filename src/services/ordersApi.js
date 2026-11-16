
const STORAGE_KEY = "food-flow-orders";

const initialData = {
  tables: [
    {
      id: 1,
      number: 1,
      capacity: 4,
      status: "aberta",
      commandId: 101,
    },
    {
      id: 2,
      number: 2,
      capacity: 2,
      status: "aberta",
      commandId: 102,
    },
    {
      id: 3,
      number: 3,
      capacity: 4,
      status: "livre",
      commandId: null,
    },
  ],

  commands: [
    {
      id: 101,
      tableId: 1,
      status: "aberta",
      rounds: [],
      tasting: null,
    },
    {
      id: 102,
      tableId: 2,
      status: "aberta",
      rounds: [],
      tasting: null,
    },
  ],
};

// Cardápio provisório.
// Depois, substitua pelos produtos fornecidos pelo João.
export const menu = [
  {
    id: 1,
    name: "Hambúrguer artesanal",
    category: "Principal",
    price: 35.00,
  },
  {
    id: 2,
    name: "Pizza de mussarela",
    category: "Principal",
    price: 42.00,
  },
  {
    id: 3,
    name: "Batata frita",
    category: "Entrada",
    price: 18.00,
  },
  {
    id: 4,
    name: "Pudim",
    category: "Sobremesa",
    price: 12.00,
  },
  {
    id: 5,
    name: "Refrigerante",
    category: "Bebida",
    price: 7.00,
  },
  {
    id: 6,
    name: "Suco natural",
    category: "Bebida",
    price: 10.00,
  },
];

function readData() {
  const saved = localStorage.getItem(STORAGE_KEY);

  if (!saved) {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(initialData)
    );

    return structuredClone(initialData);
  }

  return JSON.parse(saved);
}

function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export const ordersApi = {
  async getTables() {
    const data = readData();
    return data.tables;
  },

  async getCommands() {
    const data = readData();
    return data.commands;
  },

  async getCommand(commandId) {
    const data = readData();

    return (
      data.commands.find(
        (command) => command.id === Number(commandId)
      ) || null
    );
  },

  async createOrder(commandId, items, source) {
    const data = readData();

    const command = data.commands.find(
      (item) => item.id === Number(commandId)
    );

    if (!command || command.status !== "aberta") {
      throw new Error("Comanda não encontrada ou fechada.");
    }

    if (!items.length) {
      throw new Error("Adicione pelo menos um produto.");
    }

    const roundItems = items.map((item) => {
      const product = menu.find(
        (product) => product.id === Number(item.productId)
      );

      if (!product) {
        throw new Error("Produto não encontrado.");
      }

      const quantity = Number(item.quantity);

      if (!Number.isInteger(quantity) || quantity < 1) {
        throw new Error("Quantidade inválida.");
      }

      return {
        id: crypto.randomUUID(),
        productId: product.id,
        name: product.name,
        price: product.price,
        quantity,
        status: "em preparo",
      };
    });

    const round = {
      id: crypto.randomUUID(),
      number: command.rounds.length + 1,
      source,
      status: "em preparo",
      createdAt: new Date().toISOString(),
      items: roundItems,
    };

    command.rounds.push(round);

    saveData(data);

    return round;
  },

  async deliverRound(commandId, roundId) {
    const data = readData();

    const command = data.commands.find(
      (item) => item.id === Number(commandId)
    );

    if (!command) {
      throw new Error("Comanda não encontrada.");
    }

    const round = command.rounds.find(
      (item) => item.id === roundId
    );

    if (!round) {
      throw new Error("Rodada não encontrada.");
    }

    round.status = "entregue";

    round.items.forEach((item) => {
      item.status = "entregue";
    });

    saveData(data);

    return round;
  },

  async saveTasting(commandId, tasting) {
    const data = readData();

    const command = data.commands.find(
      (item) => item.id === Number(commandId)
    );

    if (!command) {
      throw new Error("Comanda não encontrada.");
    }

    command.tasting = {
      beverage: tasting.beverage,
      servingTime: tasting.servingTime,
    };

    saveData(data);

    return command.tasting;
  },
};
