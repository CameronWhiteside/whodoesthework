
// this file is generated — do not edit it


declare module "svelte/elements" {
	export interface HTMLAttributes<T> {
		'data-sveltekit-keepfocus'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-noscroll'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-preload-code'?:
			| true
			| ''
			| 'eager'
			| 'viewport'
			| 'hover'
			| 'tap'
			| 'off'
			| undefined
			| null;
		'data-sveltekit-preload-data'?: true | '' | 'hover' | 'tap' | 'off' | undefined | null;
		'data-sveltekit-reload'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-replacestate'?: true | '' | 'off' | undefined | null;
	}
}

export {};


declare module "$app/types" {
	export interface AppTypes {
		RouteId(): "/" | "/developer" | "/developer/[username]" | "/matches" | "/search" | "/shortlist";
		RouteParams(): {
			"/developer/[username]": { username: string }
		};
		LayoutParams(): {
			"/": { username?: string };
			"/developer": { username?: string };
			"/developer/[username]": { username: string };
			"/matches": Record<string, never>;
			"/search": Record<string, never>;
			"/shortlist": Record<string, never>
		};
		Pathname(): "/" | `/developer/${string}` & {} | "/matches" | "/search" | "/shortlist";
		ResolvedPathname(): `${"" | `/${string}`}${ReturnType<AppTypes['Pathname']>}`;
		Asset(): string & {};
	}
}