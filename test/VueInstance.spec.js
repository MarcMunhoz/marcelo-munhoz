import { mount, RouterLinkStub } from "@vue/test-utils";
import Footer from "@/components/Footer.vue";
import Logo from "@/components/Logo.vue";
import NavBar from "@/components/NavBar.vue";

describe("Logo", () => {
  test("is a Vue instance", () => {
    const wrapper = mount(Logo);
    expect(wrapper.isVueInstance()).toBeTruthy();
  });
});

describe("NavBar", () => {
  const wrapper = mount(NavBar, {
    stubs: { NuxtLink: RouterLinkStub }
  });

  test("is a Vue instance", () => {
    expect(wrapper.isVueInstance()).toBeTruthy();
  });

  test("Have navbar and own links", () => {
    expect(wrapper.find("nav")).toBeTruthy();
  });
});

describe("Footer", () => {
  test("is a Vue instance", () => {
    const wrapper = mount(Footer);
    expect(wrapper.isVueInstance()).toBeTruthy();
  });
});
