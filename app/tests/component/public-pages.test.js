import { flushPromises } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createClock, createRouter, createTestMount } from "../harness/index.js";
import About from "../../src/pages/About.vue";
import ErrorNotFound from "../../src/pages/ErrorNotFound.vue";
import IndexPage from "../../src/pages/IndexPage.vue";

afterEach(() => vi.restoreAllMocks());

describe("public pages", () => {
  const pageOptions = { global: { stubs: { QPage: { template: "<main><slot /></main>" } } } };
  const mountPage = async (component, options = {}) => {
    const router = createRouter({ routes: [{ path: "/", component: { template: "<div />" } }] });
    await router.isReady();
    return createTestMount({ router })(component, { ...pageOptions, ...options });
  };

  it("renders the Home content, responsive landmarks, media, skills, and safely ordered projects", async () => {
    const clock = createClock(new Date("2026-06-04T12:00:00.000Z"));
    clock.install();
    const wrapper = await mountPage(IndexPage);

    expect(wrapper.get("h1").text()).toBe("Eu faço coisas para a web.");
    expect(wrapper.get(".home-facts").text()).toContain("22 anos na web");
    const hero = wrapper.get(".home-hero-image");
    expect(hero.attributes()).toMatchObject({ alt: "Marcelo Munhoz", fetchpriority: "high", width: "1731", height: "909" });
    expect(wrapper.get(".home-hero").attributes("aria-labelledby")).toBe("home-title");
    expect(wrapper.get(".home-intro").attributes("aria-labelledby")).toBe("home-title");
    expect(wrapper.get(".home-facts").attributes("aria-label")).toBe("Sobre Marcelo");
    expect(wrapper.get(".home-knowledge").attributes("aria-labelledby")).toBe("knowledge-title");
    expect(wrapper.get(".home-projects").attributes("aria-labelledby")).toBe("projects-title");
    expect(wrapper.findAll(".knowledge-item")).toHaveLength(19);
    const projects = wrapper.findAll(".project-link");
    expect(projects.map((link) => link.find("strong").text())).toEqual([
      "365 Movies", "Public Flickr Photos", "Random Pass", "Tiny Image App", "Vuetify Todo", "Weather App",
    ]);
    expect(projects.every((link) => link.attributes("target") === "_blank" && link.attributes("rel") === "noopener noreferrer")).toBe(true);

    wrapper.unmount();
    clock.restore();
  });

  it("renders About content and opens every social destination without opener access", async () => {
    const open = vi.spyOn(window, "open").mockImplementation(() => null);
    const wrapper = await mountPage(About, { attachTo: document.body });

    expect(wrapper.text()).toContain("Eu sou uma pessoa simples, porém complexa.");
    expect(wrapper.get(".about-image img").attributes("src")).toContain("res.cloudinary.com");
    expect(wrapper.get(".about-biography img").attributes("src")).toContain("real_madrid.svg");
    expect(wrapper.get(".about-introduction").classes()).toContain("about-introduction");
    const buttons = wrapper.findAll(".social-links button");
    expect(buttons).toHaveLength(6);
    expect(buttons.map((button) => button.attributes("aria-label"))).toEqual([
      "envelope", "facebook-square", "github", "gitlab", "linkedin", "twitter",
    ]);

    for (const button of buttons) await button.trigger("click");
    expect(open.mock.calls).toEqual([
      ["mailto:me@marcelomunhoz.com", "project", "noopener,noreferrer"],
      ["https://www.facebook.com/marcelo.munhoz", "project", "noopener,noreferrer"],
      ["https://github.com/MarcMunhoz", "project", "noopener,noreferrer"],
      ["https://gitlab.com/hiMunhoz", "project", "noopener,noreferrer"],
      ["https://www.linkedin.com/in/marcelomunhoz", "project", "noopener,noreferrer"],
      ["https://twitter.com/heyMunhoz", "project", "noopener,noreferrer"],
    ]);

    const icon = wrapper.get(".social-links i");
    await icon.trigger("mouseover");
    expect(icon.classes()).toContain("fa-flip");
    await icon.trigger("mouseleave");
    expect(icon.classes()).not.toContain("fa-flip");
    wrapper.unmount();
  });

  it("renders the not-found recovery and returns home", async () => {
    const Home = { template: "<main>Home</main>" };
    const router = createRouter({
      initialPath: "/missing",
      routes: [
        { path: "/", component: Home },
        { path: "/:pathMatch(.*)*", component: ErrorNotFound },
      ],
    });
    const wrapper = createTestMount({ router })(ErrorNotFound);
    await router.isReady();

    expect(wrapper.text()).toContain("404");
    expect(wrapper.text()).toContain("Oops.");
    await wrapper.get("a").trigger("click");
    await flushPromises();
    expect(router.currentRoute.value.path).toBe("/");
    wrapper.unmount();
  });
});
