import { intro } from "modulato";

// The homepage choreographs its own entrance (pages/home-1/page.tsx); skip the default page fade,
// which would fade the orange page in over the cream body and read as a flash.
export default intro({ run() {} });
