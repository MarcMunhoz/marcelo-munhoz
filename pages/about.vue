<template>
  <div class="container-fluid about mt-4">
    <div class="row">
      <div class="col-md-5">
        <img src="https://res.cloudinary.com/marcelo-munhoz/image/upload/v1619299261/me.jpg" title="Marcelo Munhoz" class="rounded" />
      </div>
      <div class="col-md-7">
        <p>
          Eu sou um desenvolvedor front-end que reside em São Paulo, Brasil.
        </p>
        <p>
          Desde a adolescência, quando tive o primeiro contato com um computador com monitor de fósforo verde, fiquei fascinado pela tecnologia e tenho transitado pelo mundo digital.
        </p>

        <p>
          Entre em contato pelo e-mail:
          <a href="mailto:me@marcelomunhoz.com" class="font-weight-bold">me@marcelomunhoz.com</a>
        </p>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: "About",
  head() {
    return {
      title: "Marcelo Munhoz - About",
    };
  },
};
</script>

<style lang="scss" scoped>
.about {
  img {
    box-shadow: hsl(0, 0%, 50%) 0px 0px 20px 0px;
    width: 100%;
  }
}
</style>
