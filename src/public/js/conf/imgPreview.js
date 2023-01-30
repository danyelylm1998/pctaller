const
  $imgPreview = document.querySelector("#imgPreview"),
  $customFile = document.querySelector("#customFile")
  ;

$customFile.addEventListener("change", () => {
  const files = $customFile.files;
  if (!files || !files.length) {
    $imgPreview.src = "";
    return;
  }
  const file = files[0];
  const objectURL = URL.createObjectURL(file);
  $imgPreview.src = objectURL;
});