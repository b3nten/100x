#!/usr/bin/env node

import process from "node:process"
import {dev} from "./dev.ts";
import {build} from "./build.ts";

const firstArg = process.argv[2]

switch (firstArg) {
	case "dev": {
		dev().catch((err) => {
			console.error(err);
			process.exit(1);
		});
		break;
	}
	case "build": {
		build().catch((err) => {
			console.error(err);
			process.exit(1);
		})
		break;
	}
}