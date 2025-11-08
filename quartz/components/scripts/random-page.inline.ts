function setupRandomPageButtons() {
  const buttons = document.querySelectorAll<HTMLButtonElement>("[data-random-page]")
  buttons.forEach((button) => {
    const slugs = button.dataset.randomSlugs
      ? (JSON.parse(button.dataset.randomSlugs) as string[])
      : []

    if (!Array.isArray(slugs) || slugs.length === 0) {
      button.disabled = true
      return
    }

    const onClick = () => {
      const choice = slugs[Math.floor(Math.random() * slugs.length)]
      if (!choice) {
        return
      }

      const targetPath = choice === "index" ? "/" : `/${choice}`
      if (typeof window.spaNavigate === "function") {
        window.spaNavigate(new URL(targetPath, window.location.toString()), false)
      } else {
        window.location.assign(targetPath)
      }
    }

    button.addEventListener("click", onClick)
    window.addCleanup(() => button.removeEventListener("click", onClick))
  })
}

document.addEventListener("nav", setupRandomPageButtons)
