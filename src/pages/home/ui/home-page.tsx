import { Link } from "react-router";

export function HomePage() {
  return (
    <section aria-labelledby="welcome-title" className="shell:py-6 shell:sm:py-12">
      <div className="shell:rounded-3xl shell:bg-[#e8f3ee] shell:p-7 shell:sm:p-14">
        <p className="shell:mb-5 shell:text-sm shell:font-bold shell:uppercase shell:tracking-widest shell:text-[#176044]">Добро пожаловать в Microfronts Lab</p>
        <h1 id="welcome-title" className="shell:max-w-[760px] shell:text-[clamp(36px,6vw,64px)] shell:font-bold shell:leading-[1.08] shell:tracking-tight">Ваш следующий выбор начинается здесь.</h1>
        <p className="shell:mt-6 shell:max-w-[560px] shell:text-lg shell:leading-relaxed shell:text-[#425b51]">Загляните в каталог, найдите то, что вам нравится, и соберите свою корзину. Войдите или создайте аккаунт, чтобы открыть каталог и начать покупки.</p>
        <Link to="/login" className="shell:mt-8 shell:inline-flex shell:min-h-12 shell:items-center shell:rounded-xl shell:bg-[#176044] shell:px-6 shell:py-3 shell:font-bold shell:text-white shell:no-underline shell:hover:bg-[#104a33] shell:focus-visible:outline-2 shell:focus-visible:outline-offset-4">Войти и открыть каталог <span aria-hidden="true" className="shell:ml-3">→</span></Link>
      </div>
      <div className="shell:mt-8 shell:grid shell:gap-6 shell:sm:grid-cols-3">
        {[
          ["01", "Выбирайте", "Все товары и цены — в каталоге. Найдите то, что подходит именно вам."],
          ["02", "Собирайте корзину", "Добавляйте товары и меняйте количество перед покупкой."],
          ["03", "Будьте как дома", "Создайте аккаунт, чтобы возвращаться к своей корзине."],
        ].map(([number, title, description]) => (
          <div key={number} className="shell:p-4">
            <span className="shell:text-sm shell:font-bold shell:text-[#176044]">{number}</span>
            <h2 className="shell:mt-3 shell:text-xl shell:font-bold">{title}</h2>
            <p className="shell:mt-2 shell:leading-relaxed shell:text-[#536175]">{description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
