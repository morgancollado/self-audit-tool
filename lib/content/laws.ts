// Bundled law-content manifest. One entry per jurisdiction (plus the national
// voluntary broker-opt-out baseline). Selection/region-gating lives in
// lib/remediate/rights.ts; this file is just the import list. When adding a state,
// drop a JSON file in content/law/ and add its import + array entry here.

import { Law } from './types';

import law_us_ak_none from '../../content/law/us-ak-none.json';
import law_us_al_none from '../../content/law/us-al-none.json';
import law_us_ar_none from '../../content/law/us-ar-none.json';
import law_us_az_none from '../../content/law/us-az-none.json';
import law_us_ca_ccpa from '../../content/law/us-ca-ccpa.json';
import law_us_co_cpa from '../../content/law/us-co-cpa.json';
import law_us_ct_ctdpa from '../../content/law/us-ct-ctdpa.json';
import law_us_data_broker_optout from '../../content/law/us-data-broker-optout.json';
import law_us_dc_none from '../../content/law/us-dc-none.json';
import law_us_de_dpdpa from '../../content/law/us-de-dpdpa.json';
import law_us_fl_fdbr from '../../content/law/us-fl-fdbr.json';
import law_us_ga_none from '../../content/law/us-ga-none.json';
import law_us_hi_none from '../../content/law/us-hi-none.json';
import law_us_ia_icdpa from '../../content/law/us-ia-icdpa.json';
import law_us_id_none from '../../content/law/us-id-none.json';
import law_us_il_bipa from '../../content/law/us-il-bipa.json';
import law_us_in_incdpa from '../../content/law/us-in-incdpa.json';
import law_us_ks_none from '../../content/law/us-ks-none.json';
import law_us_ky_kcdpa from '../../content/law/us-ky-kcdpa.json';
import law_us_la_none from '../../content/law/us-la-none.json';
import law_us_ma_none from '../../content/law/us-ma-none.json';
import law_us_md_modpa from '../../content/law/us-md-modpa.json';
import law_us_me_isp from '../../content/law/us-me-isp.json';
import law_us_mi_none from '../../content/law/us-mi-none.json';
import law_us_mn_mcdpa from '../../content/law/us-mn-mcdpa.json';
import law_us_mo_none from '../../content/law/us-mo-none.json';
import law_us_ms_none from '../../content/law/us-ms-none.json';
import law_us_mt_mcdpa from '../../content/law/us-mt-mcdpa.json';
import law_us_nc_none from '../../content/law/us-nc-none.json';
import law_us_nd_none from '../../content/law/us-nd-none.json';
import law_us_ne_ndpa from '../../content/law/us-ne-ndpa.json';
import law_us_nh_ndpa from '../../content/law/us-nh-ndpa.json';
import law_us_nj_njdpa from '../../content/law/us-nj-njdpa.json';
import law_us_nm_none from '../../content/law/us-nm-none.json';
import law_us_nv_sb220 from '../../content/law/us-nv-sb220.json';
import law_us_ny_none from '../../content/law/us-ny-none.json';
import law_us_oh_none from '../../content/law/us-oh-none.json';
import law_us_ok_none from '../../content/law/us-ok-none.json';
import law_us_or_ocpa from '../../content/law/us-or-ocpa.json';
import law_us_pa_none from '../../content/law/us-pa-none.json';
import law_us_ri_ridtppa from '../../content/law/us-ri-ridtppa.json';
import law_us_sc_none from '../../content/law/us-sc-none.json';
import law_us_sd_none from '../../content/law/us-sd-none.json';
import law_us_tn_tipa from '../../content/law/us-tn-tipa.json';
import law_us_tx_tdpsa from '../../content/law/us-tx-tdpsa.json';
import law_us_ut_ucpa from '../../content/law/us-ut-ucpa.json';
import law_us_va_vcdpa from '../../content/law/us-va-vcdpa.json';
import law_us_vt_broker from '../../content/law/us-vt-broker.json';
import law_us_wa_mhmda from '../../content/law/us-wa-mhmda.json';
import law_us_wi_none from '../../content/law/us-wi-none.json';
import law_us_wv_none from '../../content/law/us-wv-none.json';
import law_us_wy_none from '../../content/law/us-wy-none.json';

export const LAWS = [
  law_us_ak_none,
  law_us_al_none,
  law_us_ar_none,
  law_us_az_none,
  law_us_ca_ccpa,
  law_us_co_cpa,
  law_us_ct_ctdpa,
  law_us_data_broker_optout,
  law_us_dc_none,
  law_us_de_dpdpa,
  law_us_fl_fdbr,
  law_us_ga_none,
  law_us_hi_none,
  law_us_ia_icdpa,
  law_us_id_none,
  law_us_il_bipa,
  law_us_in_incdpa,
  law_us_ks_none,
  law_us_ky_kcdpa,
  law_us_la_none,
  law_us_ma_none,
  law_us_md_modpa,
  law_us_me_isp,
  law_us_mi_none,
  law_us_mn_mcdpa,
  law_us_mo_none,
  law_us_ms_none,
  law_us_mt_mcdpa,
  law_us_nc_none,
  law_us_nd_none,
  law_us_ne_ndpa,
  law_us_nh_ndpa,
  law_us_nj_njdpa,
  law_us_nm_none,
  law_us_nv_sb220,
  law_us_ny_none,
  law_us_oh_none,
  law_us_ok_none,
  law_us_or_ocpa,
  law_us_pa_none,
  law_us_ri_ridtppa,
  law_us_sc_none,
  law_us_sd_none,
  law_us_tn_tipa,
  law_us_tx_tdpsa,
  law_us_ut_ucpa,
  law_us_va_vcdpa,
  law_us_vt_broker,
  law_us_wa_mhmda,
  law_us_wi_none,
  law_us_wv_none,
  law_us_wy_none,
] as unknown as Law[];
