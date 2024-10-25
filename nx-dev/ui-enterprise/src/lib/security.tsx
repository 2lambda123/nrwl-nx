import { SectionHeading } from '@nx/nx-dev/ui-common';

export function Security(): JSX.Element {
  return (
    <section id="nx-enterprise-security" className="relative isolate">
      <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-2xl flex-col gap-16 bg-white/70 px-6 py-16 ring-1 ring-slate-200 sm:rounded-3xl sm:p-8 lg:mx-0 lg:max-w-none lg:flex-row lg:items-center lg:py-20 xl:gap-x-20 xl:px-20 dark:bg-white/5 dark:ring-white/10">
          <div className="max-w-md">
            <SectionHeading as="h2" variant="title">
              Security
            </SectionHeading>
            <p className="mt-6 text-lg">
              Nx Cloud is certified to industry standards, is constantly
              monitored, and{' '}
              <a
                href="https://security.nx.app/"
                target="_blank"
                rel="nofollow noreferrer"
                className="underline"
              >
                issues security trust reports powered by Vanta
              </a>
              .
            </p>

            <div className="mt-16 flex flex-wrap items-center gap-4">
              <div className="flex w-52 shrink-0 items-center gap-2 rounded-xl px-2 py-1 text-xs text-slate-950 ring-1 ring-slate-200 dark:text-slate-50 dark:ring-slate-700">
                <svg
                  role="img"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 64 64"
                  fill="currentColor"
                  stroke="currentColor"
                  className="h-12 w-12 shrink-0"
                >
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M30.3555 27.3511C33.6089 27.3511 33.92 24.24 33.9822 23.4933H32.3644C32.3022 24.1244 32.0711 25.9555 30.3911 25.9555C28.5066 25.9555 28.2133 23.1289 28.2133 20.5511C28.2133 17.9733 28.5333 15.3066 30.48 15.3066C32.24 15.3066 32.3378 17.2533 32.3378 17.6978H33.9466C33.9111 16.8533 33.7155 13.8933 30.5067 13.8933C27.5822 13.8933 26.5422 16.6578 26.5422 20.5422C26.5422 23.7511 26.8 27.3511 30.3555 27.3511ZM14.6755 27.1466L15.5644 23.1644H18.9067L19.7955 27.1466H21.4933L18.2844 14.0889H16.1955L13.0667 27.1466H14.6755ZM18.2599 20.4008C18.3572 20.8256 18.4603 21.2755 18.5689 21.7511H15.8755L16.0659 20.8927L16.0659 20.8927L16.0659 20.8927L16.0659 20.8927C16.5862 18.5487 17.0136 16.6232 17.1644 15.5911H17.2178C17.368 16.5078 17.728 18.0788 18.2599 20.4008L18.2599 20.4008ZM24.48 14.0889V27.1466H22.8711V14.0889H24.48ZM35.6978 14.0889H39.1733C41.2355 14.0889 42.7289 15.3778 42.7289 17.7689C42.7289 20.16 41.4222 21.5644 39.0044 21.5644H37.3333V27.1466H35.7333L35.6978 14.0889ZM38.8267 20.2311H37.3333V15.4311H38.9867C40.3644 15.4311 41.1022 16.3378 41.1022 17.7511C41.1022 19.4311 40.3466 20.2311 38.8267 20.2311ZM45.0044 23.1644L44.1155 27.1466H42.5067L45.6355 14.0889H47.7244L50.9333 27.1466H49.2355L48.3466 23.1644H45.0044ZM47.7948 20.8643L48 21.7511H45.2978L45.4882 20.8926L45.4883 20.8921L45.4884 20.8915C46.0086 18.5481 46.4358 16.623 46.5866 15.5911H46.64C46.8001 16.5676 47.198 18.2864 47.7948 20.8643ZM20.7378 46.7733C20.8444 48.0622 21.4489 49.1111 22.8355 49.1111C24.2222 49.1111 24.8089 48.3733 24.8089 46.9689C24.8089 45.5644 24.2578 44.9422 22.4978 44.0978C20.4444 43.1022 19.5555 42.1866 19.5555 40.2844C19.5036 39.3854 19.8439 38.508 20.4883 37.8789C21.1327 37.2499 22.018 36.9309 22.9155 37.0044C25.52 37.0044 26.2044 38.8444 26.2489 40.4089H24.6311C24.5689 39.7511 24.3733 38.32 22.8533 38.32C22.3703 38.2922 21.9 38.481 21.5701 38.8349C21.2403 39.1888 21.085 39.6712 21.1467 40.1511C21.1467 41.3422 21.68 41.9289 23.2978 42.6666C25.5911 43.76 26.4711 44.8355 26.4711 46.8266C26.552 47.8159 26.1903 48.7902 25.4833 49.4869C24.7763 50.1836 23.7968 50.531 22.8089 50.4355C20.1422 50.4355 19.2533 48.6578 19.1467 46.7733H20.7378ZM31.7155 50.4444C34.5778 50.4444 35.6889 48.1155 35.6889 43.6C35.6889 39.1555 34.5244 36.9955 31.7867 36.9955C29.2 36.9955 27.84 39.0489 27.84 43.6178C27.84 48.1866 29.0489 50.4444 31.7155 50.4444ZM29.4667 43.6C29.4667 47.2089 30.1689 49.0844 31.7422 49.0844C33.3155 49.0844 34.0089 47.3066 34.0089 43.6266C34.0089 39.9466 33.3155 38.4 31.7244 38.4C30.1333 38.4 29.4933 40.1511 29.4933 43.5555L29.4667 43.6ZM41.1911 50.4444C44.4444 50.4444 44.7644 47.3333 44.8178 46.5955H43.2C43.1467 47.2711 42.9067 49.0489 41.2267 49.0489C39.3422 49.0489 39.0489 46.2844 39.0489 43.6533C39.0489 41.0222 39.3689 38.4 41.3244 38.4C43.0755 38.4 43.1733 40.3466 43.1733 40.7911H44.7822C44.7467 39.9466 44.5511 36.9955 41.3511 36.9955C38.4267 36.9955 37.3778 39.7511 37.3778 43.6355C37.3778 46.8889 37.6355 50.4444 41.1911 50.4444Z"
                  />
                  <path
                    d="M12.8622 32H51.1378"
                    strokeWidth="1.33333"
                    strokeLinejoin="round"
                  />
                </svg>
                SSAE18/SOC 2 type 1 and type 2 reports
              </div>
              <div className="flex w-48 shrink-0 items-center gap-2 rounded-xl px-2 py-1 text-xs text-slate-950 ring-1 ring-slate-200 dark:text-slate-50 dark:ring-slate-700">
                <svg
                  role="img"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 64 64"
                  fill="currentColor"
                  className="h-12 w-12 shrink-0"
                >
                  <title>European Union</title>
                  <path d="M32.8533 10.3734L32.2844 8.59559C32.2943 8.44832 32.1828 8.32097 32.0356 8.31115C31.8883 8.30133 31.7609 8.41276 31.7511 8.56004L31.1822 10.3378H29.3333C29.2172 10.3306 29.1106 10.402 29.0732 10.5122C29.0358 10.6224 29.0768 10.7439 29.1733 10.8089L30.6756 11.8934L30.0978 13.6711C30.066 13.7798 30.1063 13.8967 30.1983 13.9627C30.2903 14.0287 30.4139 14.0294 30.5067 13.9645L32 12.88L33.5289 13.9823C33.6198 14.0531 33.7468 14.055 33.8398 13.9868C33.9328 13.9186 33.9691 13.797 33.9289 13.6889L33.36 11.9111L34.8178 10.8445C34.9125 10.7803 34.9536 10.6613 34.9187 10.5523C34.8837 10.4434 34.7811 10.3705 34.6667 10.3734H32.8533ZM32.8533 51.9467L32.2844 50.1689C32.2992 50.0217 32.1917 49.8903 32.0444 49.8756C31.8972 49.8609 31.7658 49.9683 31.7511 50.1156L31.1822 51.8934H29.3333C29.2172 51.8861 29.1106 51.9576 29.0732 52.0678C29.0358 52.1779 29.0768 52.2995 29.1733 52.3645L30.6756 53.4578L30.0978 55.2356C30.066 55.3443 30.1063 55.4612 30.1983 55.5272C30.2903 55.5932 30.4139 55.5939 30.5067 55.5289L32 54.4445L33.4933 55.5823C33.5843 55.6531 33.7112 55.655 33.8042 55.5868C33.8972 55.5186 33.9336 55.397 33.8933 55.2889L33.3244 53.5112L34.8178 52.4178C34.9125 52.3536 34.9536 52.2346 34.9187 52.1257C34.8837 52.0167 34.7811 51.9438 34.6667 51.9467H32.8533ZM22.0978 11.4134L22.6756 13.1911H24.5244C24.6389 13.1882 24.7415 13.2611 24.7764 13.3701C24.8114 13.4791 24.7703 13.5981 24.6756 13.6623L23.1822 14.7467L23.7511 16.5245C23.7914 16.6325 23.755 16.7542 23.662 16.8224C23.569 16.8905 23.4421 16.8887 23.3511 16.8178L21.8489 15.7334L20.3556 16.7823C20.2646 16.8531 20.1377 16.855 20.0447 16.7868C19.9517 16.7186 19.9153 16.597 19.9556 16.4889L20.5244 14.7111L19.0311 13.6267C18.9364 13.5625 18.8953 13.4435 18.9302 13.3346C18.9652 13.2256 19.0678 13.1527 19.1822 13.1556H21.0311L21.6089 11.3778C21.6511 11.2745 21.7549 11.2101 21.8662 11.2182C21.9775 11.2263 22.071 11.305 22.0978 11.4134ZM43.4578 49.1912L42.8889 47.4134C42.8987 47.2661 42.7873 47.1387 42.64 47.1289C42.4927 47.1191 42.3654 47.2305 42.3556 47.3778L41.7778 49.1556H39.9911C39.8767 49.1527 39.7741 49.2256 39.7391 49.3346C39.7042 49.4435 39.7453 49.5625 39.84 49.6267L41.3333 50.7112L40.7644 52.4889C40.7242 52.597 40.7606 52.7186 40.8536 52.7868C40.9465 52.855 41.0735 52.8531 41.1644 52.7823L42.6667 51.6978L44.16 52.8178C44.251 52.8887 44.3779 52.8905 44.4709 52.8224C44.5639 52.7542 44.6003 52.6325 44.56 52.5245L43.9911 50.7467L45.4844 49.6623C45.5792 49.5981 45.6203 49.4791 45.5853 49.3701C45.5504 49.2611 45.4478 49.1883 45.3333 49.1912H43.4578ZM11.6178 20.6489H13.4667L14.0444 18.8711C14.0796 18.766 14.1781 18.6952 14.2889 18.6952C14.3997 18.6952 14.4982 18.766 14.5333 18.8711L15.1111 20.6489H16.96C17.0744 20.646 17.177 20.7189 17.212 20.8279C17.247 20.9369 17.2059 21.0558 17.1111 21.12L15.6178 22.2223L16.1867 24C16.2269 24.1081 16.1905 24.2297 16.0976 24.2979C16.0046 24.3661 15.8776 24.3642 15.7867 24.2934L14.2844 23.2089L12.7911 24.2934C12.7002 24.3642 12.5732 24.3661 12.4802 24.2979C12.3873 24.2297 12.3509 24.1081 12.3911 24L12.96 22.2223L11.4667 21.12C11.3719 21.0558 11.3308 20.9369 11.3658 20.8279C11.4007 20.7189 11.5034 20.646 11.6178 20.6489ZM49.4667 41.4311H47.6178C47.5034 41.4282 47.4007 41.5011 47.3658 41.6101C47.3308 41.7191 47.3719 41.8381 47.4667 41.9023L48.96 42.9956L48.3911 44.7734C48.3509 44.8814 48.3873 45.0031 48.4802 45.0712C48.5732 45.1394 48.7002 45.1376 48.7911 45.0667L50.2844 43.9823L51.7778 45.0667C51.8705 45.1316 51.9942 45.1309 52.0862 45.0649C52.1782 44.9989 52.2185 44.882 52.1867 44.7734L51.6089 42.9956L53.1111 41.9023C53.2076 41.8373 53.2487 41.7157 53.2112 41.6055C53.1738 41.4954 53.0672 41.4239 52.9511 41.4311H51.1022L50.5333 39.6534C50.503 39.5409 50.401 39.4627 50.2844 39.4627C50.1679 39.4627 50.0659 39.5409 50.0356 39.6534L49.4667 41.4311ZM8.83556 30.9511H10.6667L11.2356 29.1734C11.2659 29.0609 11.3679 28.9827 11.4844 28.9827C11.601 28.9827 11.703 29.0609 11.7333 29.1734L12.3022 30.9511H14.1511C14.2659 30.9511 14.3678 31.0246 14.4041 31.1335C14.4404 31.2424 14.4029 31.3623 14.3111 31.4311L12.8089 32.5156L13.3867 34.2934C13.4132 34.4006 13.3708 34.5131 13.2801 34.5763C13.1894 34.6394 13.0691 34.64 12.9778 34.5778L11.4844 33.4934L9.99111 34.5778C9.90141 34.6448 9.7787 34.6463 9.68744 34.5814C9.59618 34.5165 9.55726 34.4001 9.59111 34.2934L10.16 32.5156L8.68445 31.4311C8.59381 31.3633 8.5559 31.2456 8.5899 31.1376C8.6239 31.0296 8.72239 30.9548 8.83556 30.9511ZM52.2489 30.9511H50.4C50.2926 30.956 50.1986 31.025 50.1616 31.126C50.1247 31.2271 50.1521 31.3404 50.2311 31.4134L51.7244 32.4978L51.1556 34.2756C51.1217 34.3823 51.1606 34.4987 51.2519 34.5636C51.3431 34.6285 51.4659 34.6271 51.5556 34.56L53.0667 33.4756L54.5689 34.5778C54.6586 34.6448 54.7813 34.6463 54.8726 34.5814C54.9638 34.5165 55.0027 34.4001 54.9689 34.2934L54.4 32.5156L55.8933 31.4312C55.984 31.3633 56.0219 31.2456 55.9879 31.1376C55.9539 31.0296 55.8554 30.9548 55.7422 30.9511H53.8933L53.3156 29.1734C53.2804 29.0683 53.1819 28.9974 53.0711 28.9974C52.9603 28.9974 52.8619 29.0683 52.8267 29.1734L52.2489 30.9511ZM12.3467 44.5245L12.9156 42.7467L11.4222 41.6534C11.3275 41.5892 11.2864 41.4702 11.3213 41.3612C11.3563 41.2522 11.4589 41.1794 11.5733 41.1823H13.4222L14 39.4045C14.0352 39.2994 14.1336 39.2285 14.2444 39.2285C14.3553 39.2285 14.4537 39.2994 14.4889 39.4045L15.0667 41.1823H16.8889C17.0033 41.1794 17.1059 41.2522 17.1409 41.3612C17.1758 41.4702 17.1348 41.5892 17.04 41.6534L15.5467 42.7467L16.1156 44.5245C16.1558 44.6325 16.1194 44.7542 16.0264 44.8224C15.9335 44.8905 15.8065 44.8887 15.7156 44.8178L14.2222 43.7334L12.72 44.8178C12.6294 44.8679 12.5176 44.8588 12.4361 44.7948C12.3547 44.7309 12.3195 44.6244 12.3467 44.5245ZM48.9156 21.9645L48.3467 23.7423C48.3283 23.8447 48.3733 23.9481 48.4608 24.0045C48.5482 24.0608 48.661 24.0591 48.7467 24L50.2311 22.9689L51.7244 24.0534C51.8172 24.1183 51.9408 24.1176 52.0328 24.0516C52.1248 23.9856 52.1651 23.8687 52.1333 23.76L51.5556 21.9823L53.0667 20.88C53.1632 20.8151 53.2042 20.6935 53.1668 20.5833C53.1294 20.4731 53.0228 20.4017 52.9067 20.4089H51.0578L50.4889 18.6311C50.4586 18.5186 50.3565 18.4405 50.24 18.4405C50.1235 18.4405 50.0215 18.5186 49.9911 18.6311L49.4222 20.4089H47.5733C47.4589 20.406 47.3563 20.4789 47.3213 20.5879C47.2864 20.6969 47.3275 20.8158 47.4222 20.88L48.9156 21.9645ZM19.8578 51.9645L20.4267 50.1867L18.9333 49.12C18.8386 49.0558 18.7975 48.9369 18.8325 48.8279C18.8674 48.7189 18.97 48.646 19.0844 48.6489H20.9333L21.5111 46.8711C21.5463 46.766 21.6447 46.6952 21.7556 46.6952C21.8664 46.6952 21.9648 46.766 22 46.8711L22.5778 48.6489H24.4267C24.5411 48.646 24.6437 48.7189 24.6787 48.8279C24.7136 48.9369 24.6725 49.0558 24.5778 49.12L23.1111 50.2045L23.68 51.9823C23.7203 52.0903 23.6839 52.2119 23.5909 52.2801C23.4979 52.3483 23.371 52.3465 23.28 52.2756L21.7867 51.1911L20.2844 52.2756C20.1985 52.3934 20.0334 52.4193 19.9156 52.3334C19.7977 52.2475 19.7719 52.0823 19.8578 51.9645ZM41.2089 14.2223L40.64 16C40.5926 16.1111 40.6287 16.2402 40.7269 16.3106C40.825 16.381 40.9588 16.3739 41.0489 16.2934L42.5511 15.2089L44.0444 16.2934C44.1354 16.3642 44.2624 16.3661 44.3553 16.2979C44.4483 16.2297 44.4847 16.1081 44.4444 16L43.8667 14.2223L45.36 13.1289C45.4548 13.0647 45.4958 12.9458 45.4609 12.8368C45.4259 12.7278 45.3233 12.6549 45.2089 12.6578H43.36L42.7911 10.88C42.7608 10.7675 42.6587 10.6894 42.5422 10.6894C42.4257 10.6894 42.3237 10.7675 42.2933 10.88L41.7156 12.6578H39.8756C39.7594 12.6506 39.6529 12.722 39.6154 12.8322C39.578 12.9424 39.619 13.0639 39.7156 13.1289L41.2089 14.2223Z"></path>
                </svg>
                GDPR compliance
              </div>
            </div>
          </div>
          <div className="w-full flex-auto">
            <div className="mt-6">
              <h4 className="relative text-base font-medium leading-6 text-slate-900 dark:text-slate-100">
                Dedicated infrastructure
              </h4>
              <p className="mt-2">
                We can support you to self-host Nx Cloud within your own
                infrastructure or, depending on your needs, run Nx Cloud on
                managed hosts within our cloud.
              </p>
            </div>
            <div className="mt-6">
              <h4 className="relative text-base font-medium leading-6 text-slate-900 dark:text-slate-100">
                Application security
              </h4>
              <p className="mt-2">
                We consistently review our security policies and collaborate
                with third parties for penetration testing to promptly identify
                and mitigate potential risks.
              </p>
            </div>
            <div className="mt-6">
              <h4 className="relative text-base font-medium leading-6 text-slate-900 dark:text-slate-100">
                US & EU instances available
              </h4>
              <p className="mt-2">
                We support region specific hosting of Nx Cloud in the event IT
                security or data protection policies restrict international
                transfers.
              </p>
            </div>
          </div>
        </div>
      </div>
      <div
        className="absolute inset-x-0 -top-16 -z-10 flex transform-gpu justify-center overflow-hidden blur-3xl"
        aria-hidden="true"
      >
        <div
          className="aspect-[1318/752] w-[82.375rem] flex-none bg-gradient-to-r from-[#80caff] to-[#4f46e5] opacity-25"
          style={{
            clipPath:
              'polygon(73.6% 51.7%, 91.7% 11.8%, 100% 46.4%, 97.4% 82.2%, 92.5% 84.9%, 75.7% 64%, 55.3% 47.5%, 46.5% 49.4%, 45% 62.9%, 50.3% 87.2%, 21.3% 64.1%, 0.1% 100%, 5.4% 51.1%, 21.4% 63.9%, 58.9% 0.2%, 73.6% 51.7%)',
          }}
        />
      </div>
    </section>
  );
}
