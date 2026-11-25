import Brand from './Brand.jsx';
import Icon from './Icon.jsx';

export function clientLink(path, code) {
  return `/cliente/${path}${code ? '?reserva=' + encodeURIComponent(code) : ''}`;
}

export default function ProductShell({ area = 'cliente', title, description, children, code, active, publicHome = false }) {
  const admin = area !== 'cliente';
  const links = admin
    ? [['recepcao','/admin/recepcao','Recepção'],['salao','/admin/salao','Salão'],['cozinha','/admin/cozinha','Cozinha']].filter(([key])=>key===area)
    : [['inicio','/','Início'],['reservar',clientLink('reservar',code),'Reservar'],['cardapio',clientLink('cardapio',code),'Cardápio'],['perfil','/cliente/visita','Meu Perfil']];
  return <div className={`product-app ${admin?'product-admin':'product-client'} ${publicHome?'product-home':''}`}>
    <a className="skip-link" href="#product-main">Pular para o conteúdo</a>
    <header className="product-header">
      <div className="product-brand-lockup"><a className="product-brand" href={admin?'/admin':'/'} aria-label={admin?'Food Flow — administração':'Santo Garfo — início'}>{admin?<Brand inverse/>:<Brand restaurant/>}</a>
        {admin&&<span>Administração · Santo Garfo</span>}</div>
      <div className="product-header-right"><span className="product-signature"><Icon name="clock" size={20}/>Todo segundo conta</span><nav aria-label={admin?'Área de trabalho':'Navegação do cliente'}>{links.map(([key,href,label])=><a key={key} href={href} aria-current={active===key?'page':undefined}>{label}</a>)}</nav></div>
    </header>
    <main id="product-main" className="product-main">
      {!publicHome&&<div className="product-title"><h1>{title}</h1>{description&&<p>{description}</p>}</div>}
      {children}
    </main>
    <footer className="product-footer">{admin?<Brand/>:<div className="client-footer-copy"><h2>Sua visita, do início ao fim</h2><p>Uma experiência by <Brand/></p></div>}{!admin&&<a href="/admin">Acesso da equipe</a>}</footer>
  </div>;
}
