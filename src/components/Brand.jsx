import foodFlow from '../assets/Food_Flow_Logo_Transparente.png';
import foodFlowWhite from '../assets/Food_Flow_Logo_Branco.png';

const logos = {
  foodFlow,
  foodFlowWhite,
  santoGarfo: null,
};
export default function Brand({ restaurant = false, inverse = false }) {
  const name = restaurant ? 'Santo Garfo' : 'Food Flow';
  const source = restaurant
    ? logos.santoGarfo
    : inverse
      ? logos.foodFlowWhite
      : logos.foodFlow;
  return source ? (
    <img
      className="brand-image"
      width={3000}
      height={3000}
      src={source}
      alt={name}
    />
  ) : (
    <span className={restaurant ? 'brand-text restaurant-name' : 'brand-text'}>
      {name}
    </span>
  );
}
