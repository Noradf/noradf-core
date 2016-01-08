# Norad Framework Core

## Config Express template engine

You can set the default Express template engine in config file

```javascript
{
    "express": {
        "engines": {
          "default": "jade"
        }
    }
}
```

Noradf uses [consolidate](https://github.com/tj/consolidate.js) to get the template engine. You must install the template engine unless you use [swig](https://github.com/paularmstrong/swig) which is the default template engine

All your `.html` files will be rendered with the template engine you've chosen. If you want to add another template files use this configuration
 
```javascript
{
    "express": {
        "engines": {
          "default": "jade",
          "swig": "swig",
          "tpl": "nunjucks"
        }
    }
}
```

With the above configuration your `.html` files will be rendered with `jade`, your `.swig` files will be rendered with `swig` and your `.tpl` files will be rendered with `nunjucks`