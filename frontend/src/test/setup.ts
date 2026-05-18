import "@testing-library/jest-dom";

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => undefined,
    removeListener: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => false
  })
});

Object.defineProperty(window, "getComputedStyle", {
  writable: true,
  value: () => ({
    getPropertyValue: () => "",
    overflow: "auto",
    overflowX: "auto",
    overflowY: "auto"
  })
});

class ResizeObserverMock {
  observe() {
    return undefined;
  }

  unobserve() {
    return undefined;
  }

  disconnect() {
    return undefined;
  }
}

Object.defineProperty(window, "ResizeObserver", {
  writable: true,
  value: ResizeObserverMock
});

Object.defineProperty(window, "scrollTo", {
  writable: true,
  value: () => undefined
});
