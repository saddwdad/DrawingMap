function debounce(fn, wait){
    let timer = null
    return function(){
        const context = this
        const args = [...arguments]
        if(timer){
            clearTimeout(timer)
            timer = null
        }
        timer = setTimeout(() => {
            fn.apply(context, args)
        }, wait);
    }
}

const myDebounce = debounce(()=>console.log('hi', 1000), 1000)
myDebounce()