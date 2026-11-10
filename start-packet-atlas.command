#!/bin/zsh
cd "${0:A:h}" || exit 1
npm start &
packet_atlas_pid=$!
sleep 1
open http://localhost:4173
wait "$packet_atlas_pid"
