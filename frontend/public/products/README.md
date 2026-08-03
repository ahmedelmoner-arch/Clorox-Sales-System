# Product images

Keep product images in this folder. The image synchronizer reads this folder
and stores the matching relative file name in the `Products` sheet's `ImageUrl`
column.

From the `backend` folder, preview proposed links with:

```powershell
npm run sync:product-images
```

Apply only the unambiguous matches with:

```powershell
npm run sync:product-images -- --apply
```
