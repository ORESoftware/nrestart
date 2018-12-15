#!/usr/bin/env bash

export some_val=1;

outer(){

    v="$some_val"

   inner(){
      echo "$v" "$@"
   }

   export -f inner;
}


outer
inner '2' '3'
inner '4' '5'
echo "$v"
