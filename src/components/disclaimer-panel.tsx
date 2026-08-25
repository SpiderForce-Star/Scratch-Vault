import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useActiveState } from "@/lib/active-state";
import { useI18n } from "@/lib/locale";

export function DisclaimerLead() {
  const { config } = useActiveState();
  const { t } = useI18n();
  return (
    <div className="space-y-3 text-sm leading-relaxed text-muted">
      <p>{t("disc.lead1")}</p>
      <p>
        <strong className="font-medium text-fg">{t("disc.notLottery")}</strong>{" "}
        {t("disc.lead2")}
      </p>
      <p>
        {t("disc.lead3a")}{" "}
        <strong className="font-medium text-fg">{t("disc.lead3b")}</strong>{" "}
        {t("disc.lead3c", {
          name: config.name,
          age: String(config.minAge),
          az: config.minAge < 21 ? t("disc.azParen") : ".",
        })}{" "}
        <a className="underline underline-offset-2" href="tel:18005224700">
          1-800-GAMBLER
        </a>{" "}
        (1-800-522-4700)
        {config.helplineExtra ? (
          <>
            {" "}
            {t("rules.or")} {config.helplineExtra.label}{" "}
            <a
              className="underline underline-offset-2"
              href={`tel:${config.helplineExtra.tel}`}
            >
              {config.helplineExtra.tel.replace(
                /(\d)(\d{3})(\d{3})(\d{4})/,
                "$1-$2-$3-$4",
              )}
            </a>
          </>
        ) : null}
        .
      </p>
    </div>
  );
}

export function DisclaimerPanel() {
  const { config } = useActiveState();
  const { t } = useI18n();
  const holdbackBit = config.holdback
    ? t("disc.whatHoldback", {
        label: config.holdback.label,
        detail: t("holdback.pia"),
      })
    : t("disc.whatNoHoldback", { name: config.name });
  return (
    <Accordion
      type="multiple"
      defaultValue={[
        "what",
        "not",
        "odds",
        "age",
        "warranty",
        "play",
        "addiction",
        "help",
      ]}
      className="rounded-lg border border-line bg-surface px-4"
    >
      <AccordionItem value="what">
        <AccordionTrigger>{t("disc.whatTitle")}</AccordionTrigger>
        <AccordionContent>
          <p>
            {t("disc.whatBody", { holdback: holdbackBit })}
          </p>
          <p>
            {t("disc.what2")}
          </p>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="not">
        <AccordionTrigger>{t("disc.notTitle")}</AccordionTrigger>
        <AccordionContent>
          <ul className="list-disc space-y-2 pl-5">
            <li>{t("disc.not1")}</li>
            <li>{t("disc.not2")}</li>
            <li>{t("disc.not3")}</li>
            <li>{t("disc.not4")}</li>
            <li>{t("disc.not5")}</li>
            <li>{t("disc.not6")}</li>
          </ul>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="odds">
        <AccordionTrigger>{t("disc.oddsTitle")}</AccordionTrigger>
        <AccordionContent>
          <p>{t("disc.odds1")}</p>
          <p>
            {config.holdback ? t("holdback.pia") : t("holdback.none")}{" "}
            {t("disc.odds2")}
          </p>
          <p>{config.remainingDefinition}</p>
          <p>{config.claimWindow}</p>
          <p>{t("disc.odds3")}</p>
          <p>{t("disc.odds4")}</p>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="age">
        <AccordionTrigger>{t("disc.ageTitle")}</AccordionTrigger>
        <AccordionContent>
          <p>
            {t("disc.lead3a")}{" "}
            <strong className="font-medium text-fg">{t("disc.lead3b")}</strong>{" "}
            {t("disc.ageUse")} {t("disc.ageTickets", { name: config.name })}{" "}
            <strong className="font-medium text-fg">{config.minAge}+</strong>
            {config.minAge < 21 ? t("disc.ageAz") : t("disc.ageRedeem")}{" "}
            {t("disc.ageFollow", { name: config.name })}
          </p>
          <p>{t("disc.age2")}</p>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="warranty">
        <AccordionTrigger>{t("disc.warrantyTitle")}</AccordionTrigger>
        <AccordionContent>
          <p>
            {t("disc.warranty1a")}{" "}
            <strong className="font-medium text-fg">{t("disc.warrantyAsIs")}</strong>{" "}
            {t("disc.warrantyAnd")}{" "}
            <strong className="font-medium text-fg">{t("disc.warrantyAsAvail")}</strong>
            {t("disc.warranty1b")}
          </p>
          <p>{t("disc.warranty2")}</p>
          <p>{t("disc.warranty3", { lottery: config.lotteryName })}</p>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="play">
        <AccordionTrigger>{t("disc.playTitle")}</AccordionTrigger>
        <AccordionContent>
          <p>{t("disc.play1")}</p>
          <ul className="list-disc space-y-2 pl-5">
            <li>{t("disc.playLi1")}</li>
            <li>{t("disc.playLi2")}</li>
            <li>{t("disc.playLi3")}</li>
            <li>{t("disc.playLi4")}</li>
            <li>{t("disc.playLi5")}</li>
          </ul>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="addiction">
        <AccordionTrigger>{t("disc.addictionTitle")}</AccordionTrigger>
        <AccordionContent>
          <p>{t("disc.addiction1")}</p>
          <p>{t("disc.addictionWarn")}</p>
          <ul className="list-disc space-y-2 pl-5">
            <li>{t("disc.addictionLi1")}</li>
            <li>{t("disc.addictionLi2")}</li>
            <li>{t("disc.addictionLi3")}</li>
            <li>{t("disc.addictionLi4")}</li>
            <li>{t("disc.addictionLi5")}</li>
            <li>{t("disc.addictionLi6")}</li>
            <li>{t("disc.addictionLi7")}</li>
          </ul>
          <p>{t("disc.addiction2")}</p>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="help">
        <AccordionTrigger>{t("disc.helpTitle")}</AccordionTrigger>
        <AccordionContent>
          <ul className="space-y-3">
            <li>
              <p className="text-fg">{t("disc.helpNational")}</p>
              <p>
                {t("age.help")}{" "}
                <a
                  className="underline underline-offset-2"
                  href="tel:18005224700"
                >
                  1-800-GAMBLER
                </a>{" "}
                {t("disc.helpHours")}
              </p>
              <p>
                <a
                  className="underline underline-offset-2"
                  href="https://www.ncpgambling.org/"
                  target="_blank"
                  rel="noreferrer"
                >
                  ncpgambling.org
                </a>
              </p>
            </li>
            {config.helplineExtra ? (
              <li>
                <p className="text-fg">{config.helplineExtra.label}</p>
                <p>
                  <a
                    className="underline underline-offset-2"
                    href={`tel:${config.helplineExtra.tel}`}
                  >
                    {config.helplineExtra.tel.replace(
                      /(\d)(\d{3})(\d{3})(\d{4})/,
                      "$1-$2-$3-$4",
                    )}
                  </a>
                </p>
              </li>
            ) : null}
            {config.playResponsiblyUrl ? (
              <li>
                <p className="text-fg">
                  {t("disc.helpPlayLottery", { name: config.name })}
                </p>
                <p>
                  <a
                    className="underline underline-offset-2"
                    href={config.playResponsiblyUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {config.playResponsiblyUrl.replace(/^https?:\/\//, "")}
                  </a>
                </p>
              </li>
            ) : null}
            {config.id === "tn" ? (
              <li>
                <p className="text-fg">{t("disc.helpTn")}</p>
                <p>
                  <a
                    className="underline underline-offset-2"
                    href="https://www.tn.gov/behavioral-health/substance-abuse-services/treatment/problem-gambling-programs.html"
                    target="_blank"
                    rel="noreferrer"
                  >
                    {t("disc.helpTnDept")}
                  </a>
                </p>
                <p>
                  {t("disc.helpMemphis")}{" "}
                  <a
                    className="underline underline-offset-2"
                    href="tel:19016787867"
                  >
                    901-678-STOP
                  </a>
                </p>
              </li>
            ) : null}
          </ul>
          <p>
            {t("disc.helpCrisisA")}{" "}
            <strong className="font-medium text-fg">988</strong>{" "}
            {t("disc.helpCrisisB")}
          </p>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
