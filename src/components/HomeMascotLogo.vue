<script setup lang='ts'>
import mascotMotionDarkUrl from '../assets/home-mascot-dark.gif'
import mascotMotionLightUrl from '../assets/home-mascot-light.gif'
import mascotStillDarkUrl from '../assets/home-mascot-still-dark.png'
import mascotStillLightUrl from '../assets/home-mascot-still-light.png'
</script>

<template>
  <span class='home-mascot-logo' data-testid='home-mascot-logo' aria-hidden='true'>
    <img
      class='home-mascot-motion home-mascot-dark'
      :src='mascotMotionDarkUrl'
      alt=''
      width='100'
      height='100'
      draggable='false'
    />
    <img
      class='home-mascot-motion home-mascot-light'
      :src='mascotMotionLightUrl'
      alt=''
      width='100'
      height='100'
      draggable='false'
    />
    <img
      class='home-mascot-still home-mascot-dark'
      :src='mascotStillDarkUrl'
      alt=''
      width='100'
      height='100'
      draggable='false'
    />
    <img
      class='home-mascot-still home-mascot-light'
      :src='mascotStillLightUrl'
      alt=''
      width='100'
      height='100'
      draggable='false'
    />
  </span>
</template>

<style>
.home-mascot-logo {
  position: relative;
  overflow: hidden;
}

.home-mascot-logo img {
  display: none;
  width: 100%;
  height: 100%;
  object-fit: contain;
  pointer-events: none;
  user-select: none;
  -webkit-user-drag: none;
}

:root:not([data-theme='light']) .home-mascot-logo .home-mascot-motion.home-mascot-dark,
:root[data-theme='light'] .home-mascot-logo .home-mascot-motion.home-mascot-light {
  display: block;
}

@media (prefers-reduced-motion: reduce) {
  :root:not([data-theme='light']) .home-mascot-logo .home-mascot-motion.home-mascot-dark,
  :root[data-theme='light'] .home-mascot-logo .home-mascot-motion.home-mascot-light {
    display: none;
  }

  :root:not([data-theme='light']) .home-mascot-logo .home-mascot-still.home-mascot-dark,
  :root[data-theme='light'] .home-mascot-logo .home-mascot-still.home-mascot-light {
    display: block;
  }
}
</style>
