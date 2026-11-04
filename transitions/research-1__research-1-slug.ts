import { transition } from "modulato";
import { titleFlight } from "@/lib/title-flight";

export default transition({ symmetric: true, run: titleFlight });
