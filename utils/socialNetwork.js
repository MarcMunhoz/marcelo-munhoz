import Vue from "vue";

new Vue({
  name: "SocialNetwork",
});

// Define the list 'useItOn' with "share" to share buttons or "where" to network list

const data = [
  {
    nameAccount: "gitlab",
    iconPrefix: "fab",
    urlAccount: "https://gitlab.com/",
    userAccount: "hiMunhoz",
    useItOn: ["where"],
  },
  {
    nameAccount: "linkedin",
    iconPrefix: "fab",
    urlAccount: "https://www.linkedin.com/in/",
    userAccount: "marcelomunhoz",
    useItOn: ["share", "where"],
  },
  {
    nameAccount: "twitter",
    iconPrefix: "fab",
    urlAccount: "https://twitter.com/",
    userAccount: "heyMunhoz",
    useItOn: ["share", "where"],
  },
  {
    nameAccount: "facebook-square",
    iconPrefix: "fab",
    urlAccount: "https://www.facebook.com/",
    userAccount: "marcelo.munhoz",
    useItOn: ["share", "where"],
  },
  {
    nameAccount: "envelope",
    iconPrefix: "fas",
    urlAccount: "mailto:me@marcelomunhoz.com",
    userAccount: "",
    useItOn: ["where"],
  },
  {
    nameAccount: "whatsapp",
    iconPrefix: "fab",
    useItOn: ["share"],
  },
];

export default data;
