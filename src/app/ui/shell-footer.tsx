export function ShellFooter() {
  return (
    <footer className="shell:border-t shell:border-[#e2e8f0] shell:bg-white">
      <div className="shell:w-[calc(100%-32px)] shell:max-w-[1120px] shell:mx-auto shell:flex shell:flex-wrap shell:justify-between shell:gap-3 shell:py-6 shell:text-sm shell:text-[#536175]">
        <span>© {new Date().getFullYear()} Microfronts Lab</span>
        <span>Каталог, корзина и ваш аккаунт — в одном месте.</span>
      </div>
    </footer>
  );
}
