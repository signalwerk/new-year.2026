# Jump sound - quick upward sweep
sox -n jump.mp3 synth 0.15 sine 300:600 fade h 0 0.15 0.05 gain -6 && \
# Land sound - soft thud
sox -n land.mp3 synth 0.08 noise brownnoise fade h 0 0.08 0.05 lowpass 400 gain -10 && \
# Collect coin sound - bright ding
sox -n coin.mp3 synth 0.2 sine 880 sine 1320 fade h 0 0.2 0.1 gain -8 && \
# Stomp enemy sound - satisfying pop
sox -n stomp.mp3 synth 0.1 sine 200:100 fade h 0 0.1 0.05 gain -5 && \
# Player hit sound - impact
sox -n hit.mp3 synth 0.25 noise pinknoise fade h 0 0.25 0.2 lowpass 800 tremolo 50 gain -4 && \
# Game over sound - descending
sox -n gameover.mp3 synth 0.8 sine 440:110 fade h 0 0.8 0.6 gain -6 && \
# Win/Portal sound - victory
sox -n win.mp3 synth 0.15 sine 523 : synth 0.15 sine 659 : synth 0.15 sine 784 : synth 0.4 sine 1047 fade h 0 0.85 0.3 gain -6 && \
# Bounce sound - springy
sox -n bounce.mp3 synth 0.2 sine 250:500 fade h 0 0.2 0.1 gain -6 && \
# Cannon fire sound
sox -n cannon.mp3 synth 0.15 noise whitenoise fade h 0 0.15 0.1 lowpass 1000 gain -8 && \
ls -la