import Vue from "vue";

new Vue({
  name: "ProjectsList",
});

// ICONS LIST https://raw.githubusercontent.com/saqy/vuejs-emojis/master/src/emoji.json

const data = [
  {
    projectName: "Weather App",
    projectUrl: "https://munhoz-weather-app.herokuapp.com",
    projectEmoji: "partly_sunny_rain",
  },
  {
    projectName: "Random Pass",
    projectUrl: "https://random-pass.marcelomunhoz.com",
    projectEmoji: "pencil",
  },
  {
    projectName: "Public Flickr Photos",
    projectUrl: "https://flickr-gallery.marcelomunhoz.com",
    projectEmoji: "camera_with_flash",
  },
  {
    projectName: "Vuetify Todo",
    projectUrl: "https://vuetify-todo.marcelomunhoz.com",
    projectEmoji: "pushpin",
  },
  {
    projectName: "365 Movies",
    projectUrl: "https://365movies.marcelomunhoz.com",
    projectEmoji: "movie_camera",
  },
];

export default data;
